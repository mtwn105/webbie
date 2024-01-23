const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const fileUpload = require("express-fileupload");
const axios = require("axios").default;
const { v4: uuidv4 } = require("uuid");
const prisma = require("./db");
const fs = require("fs");

require("dotenv").config();

const app = express();

const port = process.env.PORT || 3000;

app.use(fileUpload());
app.use(express.json());
app.use(cors());
app.use(morgan("combined"));

app.use(helmet.crossOriginOpenerPolicy({ policy: "same-origin-allow-popups" }));
app.use(helmet.crossOriginResourcePolicy());
app.use(helmet.noSniff());
app.use(helmet.originAgentCluster());
app.use(helmet.ieNoOpen());
app.use(
  helmet.frameguard({
    action: "sameorigin",
  })
);
app.use(helmet.hidePoweredBy());
app.use(helmet.xssFilter());

// Create a bot
app.post("/api/bot", async (req, res, next) => {
  const {
    name,
    description,
    openAiKey,
    slackToken,
    slackChannel,
    dataSource,
    sourceLink,
  } = req.body;

  // Validate all fields are not null and not empty
  if (!name || !description || !openAiKey || !dataSource || !sourceLink) {
    return res.status(400).json({
      error: "All fields are required",
    });
  }

  let botId = uuidv4();

  botId = botId.replace(/-/g, "_");

  const botLink = `${process.env.APP_BASE_URL}/bot/${botId}`;

  const bot = {
    name: name.trim().toLowerCase(),
    description: description.trim().toLowerCase(),
    openAiKey: openAiKey.trim(),
    slackToken: slackToken ? slackToken.trim() : "",
    slackChannel: slackChannel ? slackChannel.trim() : "",
    sourceLink: sourceLink.trim(),
    dataSource,
    botLink,
    botId,
  };

  if (dataSource === "CSV" || dataSource === "TEXT") {
    bot.sourceLink = `${process.env.SERVER_URL}/api/file/download/${sourceLink}`;
  }

  const modelName = bot.name + "_" + bot.botId;

  // Create and Train the model
  const modelTrainSuccessfully = await createModel(modelName, bot);

  if (!modelTrainSuccessfully) {
    console.error("Model Not Trained");
    return res.status(500).json({
      error: "Something went wrong",
    });
  }

  // Create Slack Connection
  if (bot.slackToken && bot.slackToken.length > 0) {
    await createSlack(bot);
  }

  // Save bot to database
  const savedBot = await prisma.bot.create({
    data: {
      name: bot.name,
      description: bot.description,
      slackChannel: bot.slackChannel,
      sourceLink: bot.sourceLink,
      botLink: bot.botLink,
      botId: bot.botId,
    },
  });

  // Return the response
  return res.status(201).json({
    name: savedBot.name,
    description: savedBot.description,
    botId: savedBot.botId,
    botLink: savedBot.botLink,
    sourceLink: savedBot.sourceLink,
  });
});

// Fetch bot
app.get("/api/bot/:botId", async (req, res) => {
  try {
    const { botId } = req.params;

    // Get bot from database
    const bot = await prisma.bot.findUnique({
      where: {
        botId,
      },
    });

    // Check if bot exists or not
    if (!bot) {
      return res.status(404).json({
        error: "Bot not found",
      });
    }

    // Return the response
    return res.status(200).json({
      name: bot.name,
      description: bot.description,
      botId: bot.botId,
      botLink: bot.botLink,
      sourceLink: bot.sourceLink,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      error: "Something went wrong",
    });
  }
});

// Ask Question to the bot
app.post("/api/bot/question/:botId", async (req, res) => {
  try {
    const { question } = req.body;
    const { botId } = req.params;

    // Validate all fields are not null and not empty
    if (!question) {
      return res.status(400).json({
        error: "Question is required",
      });
    }

    // Get bot from database
    const bot = await prisma.bot.findUnique({
      where: {
        botId,
      },
    });

    // Check if bot exists or not
    if (!bot) {
      return res.status(404).json({
        error: "Bot not found",
      });
    }

    const modelName = bot.name + "_" + bot.botId;

    // // Check if model exists or not

    // try {
    //   const modelExistsQuery = `SELECT * FROM models WHERE name = '${modelName}' AND STATUS = 'complete'`;

    //   const modelExistsResponse = await axios.post(
    //     `${process.env.MINDS_DB_URL}`,
    //     {
    //       query: modelExistsQuery,
    //     }
    //   );

    //   // console.log(modelExistsResponse.data);

    //   if (modelExistsResponse.data.data.length === 0) {
    //     console.log("Model Not Found + " + modelName);
    //     modelTrainSuccessfully = await createModel(modelName, savedBot);
    //   } else {
    //     modelTrainSuccessfully = true;
    //   }
    // } catch (error) {
    //   console.log("Model Not Found + " + modelName);
    //   modelTrainSuccessfully = await createModel(modelName, bot);
    // }

    // if (!modelTrainSuccessfully) {
    //   console.error("Model Not Trained");
    //   return res.status(500).json({
    //     error: "Something went wrong",
    //   });
    // }

    // Get answer from model
    const modelPredictionQuery = `SELECT answer FROM ${modelName} WHERE question = '${question}'`;

    const modelPredictionResponse = await axios.post(
      `${process.env.MINDS_DB_URL}`,
      {
        query: modelPredictionQuery,
      }
    );

    const answer = modelPredictionResponse.data.data[0][0].trim();

    // Send slack notification in channel
    // if (bot.slackChannel && bot.slackChannel.length > 0) {
    //   const message = `A Question was asked to the bot - \n\n${bot.name}: \n\nQuestion: ${question} \n\nAnswer: ${answer}`;

    //   await sendSlackMessageInChannel(bot, message);
    // }

    // save transcript
    try {
      await prisma.transcript.create({
        data: {
          question,
          answer,
          botId,
          message: `A Question was asked to the bot - \n\n${bot.name}: \n\nQuestion: ${question} \n\nAnswer: ${answer}`,
        },
      });
    } catch (error) {
      console.log(error);
    }

    // Return the response
    return res.status(200).json({
      answer,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      error: "Something went wrong",
    });
  }
});

// Upload File
app.post("/api/file/upload", async (req, res) => {
  try {
    // Get file from request
    const file = req.files.file;

    // Validate file
    if (!file) {
      return res.status(400).json({
        error: "File is required",
      });
    }

    // Validate file type as csv or txt
    if (file.mimetype !== "text/csv" && file.mimetype !== "text/plain") {
      return res.status(400).json({
        error: "File type is not supported",
      });
    }

    // Validate file size
    if (file.size > process.env.MAX_FILE_SIZE) {
      return res.status(400).json({
        error: "File size is too large",
      });
    }

    const fileName =
      uuidv4() + `.${file.mimetype === "text/csv" ? "csv" : "txt"}`;

    // Save file to uploads folder
    file.mv(`${__dirname}/uploads/${fileName}`, async (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          error: "Something went wrong",
        });
      }

      // Return the response
      return res.status(200).json({
        fileName,
      });
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      error: "Something went wrong",
    });
  }
});

// Get File
app.get("/api/file/download/:fileName", async (req, res) => {
  try {
    const { fileName } = req.params;

    // Validate file name
    if (!fileName) {
      return res.status(400).json({
        error: "File name is required",
      });
    }

    // Validate file exists
    if (!fs.existsSync(`${__dirname}/uploads/${fileName}`)) {
      return res.status(404).json({
        error: "File not found",
      });
    }

    // Return the response
    return res.status(200).download(`${__dirname}/uploads/${fileName}`);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      error: "Something went wrong",
    });
  }
});

// Error Handler
notFound = (req, res, next) => {
  res.status(404);
  const error = new Error("Not Found - " + req.originalUrl);
  next(error);
};

errorHandler = (err, req, res) => {
  res.status(res.statusCode || 500);
  res.json({
    error: err.name,
    message: err.message,
  });
};

app.use(notFound);
app.use(errorHandler);

app.listen(port, async () => {
  console.log(`Mindsdb AI Agent server is listening on ${port}`);
});

async function createModel(modelName, bot) {
  console.log("Starting Model Training");

  try {
    const modelCreationQuery = `CREATE MODEL ${modelName}
    PREDICT answer
    USING
      engine = 'llamaindex',
      index_class = 'GPTVectorStoreIndex',
      reader = 'SimpleWebPageReader',
      source_url_link = '${bot.sourceLink}',
      input_column = 'question',
      openai_api_key = '${bot.openAiKey}',
      model_name = 'gpt-3.5-turbo-instruct'`;

    console.log("Model Creation Query: " + modelCreationQuery);

    const modelCreationResponse = await axios.post(
      `${process.env.MINDS_DB_URL}`,
      {
        query: modelCreationQuery,
      }
    );

    // console.log(modelCreationResponse.data);

    // Check if model is trained completely or not in every 300 ms
    const modelTrainingStatusQuery = `SELECT STATUS FROM models WHERE name = '${modelName}'`;

    let modelTrainingStatusResponse = await axios.post(
      `${process.env.MINDS_DB_URL}`,
      {
        query: modelTrainingStatusQuery,
      }
    );

    console.log(modelTrainingStatusResponse.data);

    let time = 0;

    while (modelTrainingStatusResponse.data.data[0][0] !== "complete") {
      modelTrainingStatusResponse = await axios.post(
        `${process.env.MINDS_DB_URL}`,
        {
          query: modelTrainingStatusQuery,
        }
      );

      // console.log(modelTrainingStatusResponse.data);

      // if its more than 1 minute and model is still not trained then drop the model and return
      if (time > 60000) {
        console.log("Model Training Failed");
        await dropModel(modelName);
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      time += 300;
    }

    console.log("Model Trained Successfully");
    return true;
  } catch (error) {
    console.log("Model Training Failed");
    console.log(error);

    await dropModel(modelName);
    return false;
  }
}

async function dropModel(modelName) {
  try {
    const modelDeletionQuery = `DROP MODEL ${modelName}`;

    console.log("Model Deletion Query: " + modelDeletionQuery);

    const modelDeletionResponse = await axios.post(
      `${process.env.MINDS_DB_URL}`,
      {
        query: modelDeletionQuery,
      }
    );
  } catch (error) {
    console.log("Model Deletion Failed");
    console.log(error);
  }
}

async function createSlack(bot) {
  console.log("Creating Slack Connection and Job for Notifications");

  try {
    const createSlackChannelQuery = `CREATE DATABASE slack_${bot.botId}
WITH
  ENGINE = 'slack',
  PARAMETERS = {
      "token": "${bot.slackToken}"
    };`;

    console.log("Creating Slack Query: " + createSlackChannelQuery);

    const createSlackResponse = await axios.post(
      `${process.env.MINDS_DB_URL}`,
      {
        query: createSlackChannelQuery,
      }
    );

    console.log(createSlackResponse.data);
    console.log("Created Slack Successfully");
    console.log("Creating notification Job");

    const createJobQuery = `CREATE JOB job_${bot.botId} AS (
      INSERT INTO slack_${bot.botId}.channels(channel, text)
      SELECT
          "${bot.slackChannel}" as channel,
          message as text
      FROM psql_datasource.transcript
      WHERE createdAt > "{{PREVIOUS_START_DATETIME}}"
      ) EVERY MINUTE;`;

    const createJobResponse = await axios.post(`${process.env.MINDS_DB_URL}`, {
      query: createJobQuery,
    });

    console.log(createJobResponse.data);
    console.log("Created Notification Job Successfully");
  } catch (error) {
    console.log("Created Slack Failed");
    console.log(error);
  }
}

async function sendSlackMessageInChannel(bot, message) {
  console.log("Sending Slack Message");

  try {
    const sendingSlackMessageQuery = `INSERT INTO slack_${bot.botId}.channels (channel, text) VALUES ("${bot.slackChannel}", "${message}");`;

    console.log("Sending Slack Query: " + sendingSlackMessageQuery);

    const sendingSlackMessageResponse = await axios.post(
      `${process.env.MINDS_DB_URL}`,
      {
        query: sendingSlackMessageQuery,
      }
    );

    console.log(sendingSlackMessageResponse.data);
    console.log("Sending Slack Successfully");
  } catch (error) {
    console.log("Sending Slack Failed");
    console.log(error);
  }
}
