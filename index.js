require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const navigationRoutes = require("./routes/navigationRoutes");
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const poiRoutes= require('./routes/poiRoutes');
const locationRoutes= require('./routes/locationRoutes');
const { scheduleCronJob } = require('./utils/cronScheduler');

const http = require("http"); 
const socketSetup = require("./utils/socket");
const logger = require("./utils/logger");
const swaggerUi = require("swagger-ui-express");
const swaggerDocs = require("./config/swagger");

const DriverReport = require("./models/DriverReport");
const app = express();
const PORT = process.env.PORT || 3000;
const environment = process.env.NODE_ENV;
const HOST = process.env.HOST || '0.0.0.0';

const deleteInaccurateReports = async () => {
    try {
      console.log('Running task to delete inaccurate reports...');
      const result = await DriverReport.deleteMany({ inaccuracies: { $gt: 2 } });
      logger.info(`Deleted ${result.deletedCount} invalidated report`);
    } catch (error) {
      logger.error('Error deleting inaccurate reports:', error.message);
      throw error; 
    }
  };

 const scheduleDeleteInaccurateReports = () => {
    scheduleCronJob('*/30 * * * *', deleteInaccurateReports);
  };

  scheduleDeleteInaccurateReports();

  // Swagger setup
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Validate environment variables
if (!environment || !["production", "development", "testing"].includes(environment)) {
  logger.error("Invalid NODE_ENV. Exiting...");
  process.exit(1);
}

// Connect to MongoDB
(async () => {
  try {
    await connectDB();
    logger.info("Database connected successfully.");
  } catch (error) {
    logger.error("Failed to connect to the database. Exiting...");
    process.exit(1);
  }
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

const morganFormat = (tokens, req, res) => {
  return [
    tokens["remote-addr"](req, res),
    "-",
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, "content-length") || "0",
    tokens["response-time"](req, res) + " ms",
  ].join(" ");
};

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/navigation", navigationRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/poi',poiRoutes);
app.use('/api/location', locationRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API is up and running.",
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal server error" });
});

// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
socketSetup(server); 

// Clean shutdown
process.on("SIGINT", async () => {
  logger.info("Gracefully shutting down...");
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
server.listen(PORT, HOST, () => {
  logger.info(`Server is running on http://${HOST}:${PORT} in ${environment} mode.`);
});
