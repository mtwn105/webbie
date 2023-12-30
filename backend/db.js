const mongoose = require("mongoose");
require("dotenv").config();

function connectDB() {
  console.log("Connecting to Database");

  mongoose
    .connect(`${process.env.DB_URL}`)
    .then(() => console.log("Connected to Database"))
    .catch((error) => console.log("Connection to Database failed", error));
}

module.exports = connectDB;
