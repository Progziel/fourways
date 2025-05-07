const mongoose = require("mongoose");
require("dotenv").config();
const logger = require("../utils/logger");

const DB_URL = process.env.MONGO_DB_URL;
const connectDB = async () => {
  try {
    await mongoose.connect(DB_URL).then(() => {
    });
  } catch (error) {
    logger.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

module.exports = connectDB;
