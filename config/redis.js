const Redis = require("ioredis");
const logger = require("../utils/logger");

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
});
redisClient.on("connect", () => {
  logger.info("Connected to Redis!");
});

redisClient.on("error", (err) => {
  logger.error("Redis connection error:", err);
});

// Pub/Sub clients for Redis adapter
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

module.exports = { redisClient, pubClient, subClient };