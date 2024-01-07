const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const fileUpload = require("express-fileupload");
const axios = require("axios").default;
const { v4: uuidv4 } = require("uuid");
const prisma = require("./db");

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
  const { name, openAiKey, slackToken, sourceLink, trainingQuestions } =
    req.body;

  // Validate all fields are not null and not empty
  if (!name || !openAiKey || !slackToken || !sourceLink) {
    return res.status(400).json({
      error: "All fields are required",
    });
  }

  const botId = uuidv4();

  const botLink = `${process.env.APP_BASE_URL}/bot/${botId}`;

  const bot = {
    name,
    openAiKey,
    slackToken,
    sourceLink,
    botLink,
    botId,
  };

  // Save bot to database
  const savedBot = await prisma.bot.create({
    data: bot,
  });

  // Save Training Questions to database
  if (!!trainingQuestions && trainingQuestions.length > 0) {
    let trainingQuestionsData = trainingQuestions.map((question) => {
      return {
        question,
        botId: savedBot.id,
      };
    });

    trainingQuestionsData = await prisma.questions.createMany({
      data: trainingQuestionsData,
    });

    // Create Model
    const modelName = savedBot.name + "_" + savedBot.id;

    await createModel(modelName, savedBot);
  }

  // Return the response
  return res.status(201).json(savedBot);
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

    // Insert the question to database if not exists already
    const questionExists = await prisma.questions.findFirst({
      where: {
        question,
      },
    });

    if (!questionExists) {
      await prisma.questions.create({
        data: {
          question,
          botId: bot.id,
        },
      });
    }

    let modelTrainSuccessfully = false;

    // Check if bot is trained or not
    const modelName = bot.name + "_" + bot.id;

    // Check if model exists or not

    try {
      const modelExistsQuery = `SELECT * FROM models WHERE name = '${modelName}' AND STATUS = 'complete'`;

      const modelExistsResponse = await axios.post(
        `${process.env.MINDS_DB_URL}`,
        {
          query: modelExistsQuery,
        }
      );

      // console.log(modelExistsResponse.data);

      if (modelExistsResponse.data.data.length === 0) {
        console.log("Model Not Found + " + modelName);
        modelTrainSuccessfully = await createModel(modelName, savedBot);
      } else {
        if (!questionExists) {
          // Retrain the model
          modelTrainSuccessfully = await retrainModel(modelName, bot);
        } else {
          modelTrainSuccessfully = true;
        }
      }
    } catch (error) {
      console.log("Model Not Found + " + modelName);
      modelTrainSuccessfully = await createModel(modelName, bot);
    }

    if (!modelTrainSuccessfully) {
      console.error("Model Not Trained");
      return res.status(500).json({
        error: "Something went wrong",
      });
    }

    // Get answer from model
    const modelPredictionQuery = `SELECT answer FROM ${modelName} WHERE question = '${question}'`;

    const modelPredictionResponse = await axios.post(
      `${process.env.MINDS_DB_URL}`,
      {
        query: modelPredictionQuery,
      }
    );

    // Return the response
    return res.status(200).json({
      answer: modelPredictionResponse.data.data[0][0].trim(),
    });
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

async function createModel(modelName, savedBot) {
  console.log("Starting Model Training");

  // Drop Model
  await dropModel(modelName);

  try {
    const modelCreationQuery = `CREATE MODEL ${modelName}
    FROM psql_datasource
        (SELECT * FROM questions WHERE "botId" = '${savedBot.id}')
    PREDICT answer
    USING
      engine = 'llamaindex',
      index_class = 'GPTVectorStoreIndex',
      reader = 'SimpleWebPageReader',
      source_url_link = '${savedBot.sourceLink}',
      input_column = 'question',
      openai_api_key = '${savedBot.openAiKey}'`;

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

    // console.log(modelTrainingStatusResponse.data);

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

async function retrainModel(modelName, savedBot) {
  console.log("Starting Model Re-Training");

  try {
    const modelCreationQuery = `RETRAIN ${modelName}
    FROM psql_datasource
        (SELECT * FROM questions WHERE "botId" = '${savedBot.id}')
    PREDICT answer
    USING
      engine = 'llamaindex',
      index_class = 'GPTVectorStoreIndex',
      reader = 'SimpleWebPageReader',
      source_url_link = '${savedBot.sourceLink}',
      input_column = 'question',
      openai_api_key = '${savedBot.openAiKey}'`;

    console.log("Model Retrain Query: " + modelCreationQuery);

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

    // console.log(modelTrainingStatusResponse.data);

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

    console.log("Model Re-Trained Successfully");
    return true;
  } catch (error) {
    console.log("Model Re-Training Failed");
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
