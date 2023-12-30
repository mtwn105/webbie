const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const fileUpload = require("express-fileupload");
const axios = require("axios").default;
const { v4: uuidv4 } = require("uuid");

const { Pdf } = require("./schemas");

const connectDB = require("./db");

require("dotenv").config();

connectDB();

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

// Download PDF
app.get("/api/download/:id", async (req, res) => {
  const { id } = req.params;

  // Get PDF from DB
  const pdf = await Pdf.findOne({ fileId: id });

  // Get File
  const file = `./uploads/${pdf.fileName}`;

  // Send file
  res.download(file);

  // Give Response
  // res.json({ pdf });
});

// Upload PDF
app.post("/api/upload", async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }

    // Access the uploaded file
    const file = req.files.file;

    // Generate unique file name
    const fileId = uuidv4();
    const fileName = `${fileId}.pdf`;

    // Move file to folder
    file.mv(`./uploads/${fileName}`, (err) => {
      if (err) {
        console.log(err);
        res.status(500).send({ error: err.message });
      }
    });

    // const { fileName, fileUrl } = req.body;

    // Save PDF to DB
    const pdf = await Pdf.create({
      fileId,
      fileName,
      fileUrl: "abc",
      content: "abc",
    });

    pdf.fileUrl = `${process.env.APP_BASE_URL}/api/download/${fileId}`;

    // Scrap PDF Content
    // const { data } = await axios.post(process.env.MINDS_DB_URL, {
    //   query: `SELECT text_content FROM my_web.crawler WHERE url = '${pdf.fileUrl}' LIMIT 1`,
    // });

    const { data } = await axios.post(process.env.MINDS_DB_URL, {
      query: `SELECT text_content FROM my_web.crawler WHERE url = 'blog.amitwani.dev' LIMIT 1`,
    });

    const pdfContent = data.data[0][0];

    // Get first 2000 characters
    // let pdfContentShort = pdfContent.substring(0, 2000);

    // Shorten content for ai
    let pdfContentShort = pdfContent;
    pdfContentShort = pdfContentShort.replace(/\n/g, " ");
    pdfContentShort = pdfContentShort.replace(/\r/g, " ");
    pdfContentShort = pdfContentShort.replace(/\t/g, " ");
    pdfContentShort = pdfContentShort.replace(/"/g, "'");
    pdfContentShort = pdfContentShort.replace(/\\/g, " ");
    pdfContentShort = pdfContentShort.replace(/`/g, "'");
    pdfContentShort = pdfContentShort.replace(/%/g, " percent");
    pdfContentShort = pdfContentShort.replace(/&/g, " and ");
    pdfContentShort = pdfContentShort.replace(/@/g, " at ");
    pdfContentShort = pdfContentShort.replace(/#/g, " number ");
    pdfContentShort = pdfContentShort.replace(/\$/g, " dollar ");
    pdfContentShort = pdfContentShort.replace(/\*/g, " star ");
    pdfContentShort = pdfContentShort.replace(/\(/g, " ( ");

    pdfContentShort = pdfContentShort + "    ";

    pdfContentShort = pdfContentShort.replace(/  /g, " ");

    // pdfContentShort = pdfContentShort.substring(0, 2000);

    pdf.content = pdfContentShort;

    await pdf.save();

    // console.log(JSON.stringify(data.data[0]));

    // Give Response
    res.send({
      message: "PDF uploaded successfully",
      pdfId: fileId,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: error.message });
  }
});

// Get PDF
app.get("/api/pdf/:id", async (req, res) => {
  const { id } = req.params;

  // Get PDF from DB
  const pdf = await Pdf.findById(id);

  // Give Response
  res.json({ pdf });
});

// Give Response using MindsDB
app.post("/api/predict", async (req, res) => {
  const { pdfId, query } = req.body;

  // Get PDF from DB
  const pdf = await Pdf.findOne({ fileId: pdfId });

  // Get PDF Content
  const { content } = pdf;

  // Get Prediction
  const { data } = await axios.post(process.env.MINDS_DB_URL, {
    query: `SELECT response FROM pdf_reply WHERE content = "${content}" AND question = "${query}";`,
  });

  console.log(JSON.stringify(data));

  const prediction = data.data[0][0];

  // Give Response
  res.json({ prediction });
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
