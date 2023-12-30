const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const pdf = new Schema({
  fileName: {
    type: String,
    required: true,
  },
  fileId: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const Pdf = mongoose.model("Pdf", pdf, "pdfs");

module.exports = { Pdf };
