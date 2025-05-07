const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { secretKey } = require("../config/jwt");
const { sendPushNotification } = require("../config/firebase");
const Location = require("../models/Location");
const Notification = require("../models/Notification");
const Message = require("../models/Message");
const DriverReport = require("../models/DriverReport");
const logger = require("./logger");
const { redisClient, pubClient, subClient } = require("../config/redis");
const mongoose = require("mongoose");

const socketSetup = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Set up Redis adapter
  io.adapter(require("socket.io-redis")({ pubClient, subClient }));

  // Redis Pub/Sub subscriptions
  const channels = ["location_updates", "chat_channel", "notification_channel", "report_channel"];
  channels.forEach((channel) => {
    subClient.subscribe(channel, (err) => {
      if (err) logger.error(`Failed to subscribe to ${channel}: ${err.message}`);
      else logger.info(`Subscribed to ${channel}`);
    });
  });

  // Handle Redis Pub/Sub messages
  subClient.on("message", (channel, message) => {
    try {
      const data = JSON.parse(message);
      logger.debug(`Received on ${channel}: ${message}`);
      switch (channel) {
        case "location_updates":
          io.emit("location_update", data);
          break;
        case "chat_channel":
          io.emit("chat", data);
          break;
        case "notification_channel":
          io.emit("receive_notification", data);
          break;
        case "report_channel":
          io.emit("nearby_report", data);
          break;
      }
    } catch (err) {
      logger.error(`Error processing ${channel} message: ${err.message}`);
    }
  });

  // User management with Redis
  const registerUser = async (userId, socketId) => {
    await redisClient
      .multi()
      .hset("online_users", userId, socketId)
      .hset("online_users_reverse", socketId, userId)
      .hset("user_status", userId, "online")
      .expire(`user_status:${userId}`, 24 * 60 * 60) // 24-hour TTL
      .exec();
  };

  const removeUser = async (socketId) => {
    const userId = await redisClient.hget("online_users_reverse", socketId);
    if (userId) {
      await redisClient
        .multi()
        .hdel("online_users", userId)
        .hdel("online_users_reverse", socketId)
        .hset("user_status", userId, "offline")
        .exec();
      return userId;
    }
    return null;
  };

  // Socket.IO middleware for JWT authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      logger.warn("No token provided in handshake");
      return next(new Error("Authentication error: No token provided."));
    }
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        logger.warn(`Token verification failed: ${err.message}`);
        return next(new Error("Authentication error: Invalid or expired token."));
      }
      socket.user = decoded;
      next();
    });
  });

  // Connection handler
  io.on("connection", (socket) => {
    logger.info(`User connected (Socket ID: ${socket.id}, User ID: ${socket.user.userId})`);

    // Register user and FCM token
    socket.on("register_user", async (userId) => {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return socket.emit("error_event", { message: "Invalid user ID." });
      }
      await registerUser(userId, socket.id);
      io.emit("user_status_update", { userId, status: "online" });
      logger.info(`User registered: ${userId}`);

      // Send existing nearby reports
      try {
        const userLocation = await Location.findOne({ userId }).lean();
        if (userLocation?.coordinates) {
          const nearbyReports = await DriverReport.find({
            location: {
              $near: { $geometry: userLocation.coordinates, $maxDistance: 5000 },
            },
          })
            .limit(10)
            .lean();
          nearbyReports.forEach((report) => {
            socket.emit("nearby_report", {
              reportId: report._id,
              reportType: report.reportType,
              subCategory: report.subCategory,
              description: report.description,
              location: report.location,
              createdAt: report.createdAt,
            });
          });
        }
      } catch (err) {
        logger.error(`Error sending nearby reports to ${userId}: ${err.message}`);
      }
    });

    // Register FCM token
    socket.on("register_fcm_token", async ({ userId, token }) => {
      if (!userId || !token) {
        return socket.emit("error_event", { message: "Missing userId or token." });
      }
      try {
        await redisClient.hset(`fcm_tokens:${userId}`, "token", token);
        logger.info(`FCM token registered for user ${userId}: ${token}`);
      } catch (err) {
        logger.error(`Error registering FCM token for ${userId}: ${err.message}`);
        socket.emit("error_event", { message: "Failed to register FCM token." });
      }
    });

    // Location updates
    socket.on("update_location", async (locationData) => {
      const { userId, latitude, longitude } = locationData;
      if (!userId || !latitude || !longitude) {
        return socket.emit("error_event", { message: "Missing location data." });
      }
      try {
        const location = await Location.findOneAndUpdate(
          { userId },
          { coordinates: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] } },
          { upsert: true, new: true }
        );
        const payload = { userId, latitude, longitude };
        pubClient.publish("location_updates", JSON.stringify(payload));
        logger.info(`Location updated for ${userId}`);

        // Check for nearby reports and notify
        const nearbyReports = await DriverReport.find({
          location: {
            $near: { $geometry: location.coordinates, $maxDistance: 5000 },
          },
        })
          .limit(10)
          .lean();
        nearbyReports.forEach((report) => socket.emit("nearby_report", report));
      } catch (err) {
        logger.error(`Location update failed for ${userId}: ${err.message}`);
        socket.emit("error_event", { message: "Failed to update location." });
      }
    });

    // New report with FCM
    socket.on("new_report", async (reportData) => {
      const { reportId } = reportData;
      if (!mongoose.Types.ObjectId.isValid(reportId)) {
        return socket.emit("error_event", { message: "Invalid report ID." });
      }
      try {
        const report = await DriverReport.findById(reportId).lean();
        if (!report) {
          return socket.emit("error_event", { message: "Report not found." });
        }
        const nearbyUsers = await Location.find({
          coordinates: {
            $near: { $geometry: report.location, $maxDistance: 5000 },
          },
        }).lean();

        const payload = {
          reportId: report._id,
          reportType: report.reportType,
          subCategory: report.subCategory,
          description: report.description,
          location: report.location,
          createdAt: report.createdAt,
        };
        pubClient.publish("report_channel", JSON.stringify(payload));

        for (const user of nearbyUsers) {
          const socketId = await redisClient.hget("online_users", user.userId.toString());
          if (socketId) {
            io.to(socketId).emit("nearby_report", payload);
          } else {
            const fcmToken = await redisClient.hget(`fcm_tokens:${user.userId}`, "token");
            if (fcmToken) {
              await sendPushNotification(fcmToken, {
                title: "New Nearby Report",
                body: `${report.reportType}: ${report.description}`,
                data: { reportId: report._id.toString() },
              });
            }
          }
        }
        logger.info(`Report ${reportId} broadcasted`);
      } catch (err) {
        logger.error(`Error broadcasting report ${reportId}: ${err.message}`);
        socket.emit("error_event", { message: "Failed to broadcast report." });
      }
    });

    // Send message with FCM
    socket.on("send_message", async (messageData, callback) => {
      const { sender, receiver, content } = messageData;
      if (!sender || !receiver || !content) {
        return callback?.({ status: "error", message: "Missing message data." });
      }
      try {
        const message = await new Message({ sender, receiver, content }).save();
        const payload = { sender, receiver, content, createdAt: message.createdAt };
        pubClient.publish("chat_channel", JSON.stringify(payload));

        const receiverSocketId = await redisClient.hget("online_users", receiver);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("new_message", payload);
        } else {
          const fcmToken = await redisClient.hget(`fcm_tokens:${receiver}`, "token");
          if (fcmToken) {
            await sendPushNotification(fcmToken, {
              title: `New Message from ${sender}`,
              body: content,
              data: { messageId: message._id.toString() },
            });
          }
        }
        logger.info(`Message sent from ${sender} to ${receiver}`);
        callback?.({ status: "success", message: payload });
      } catch (err) {
        logger.error(`Message send failed: ${err.message}`);
        callback?.({ status: "error", message: "Failed to send message." });
      }
    });

    // Send notification with FCM
    socket.on("send_notification", async (notificationData, callback) => {
      const { userId, title, message } = notificationData;
      if (!userId || !title || !message) {
        return callback?.({ status: "error", message: "Missing notification data." });
      }
      try {
        const notification = await Notification.create({ userId, title, message });
        const payload = { userId, title, message, createdAt: notification.createdAt };
        pubClient.publish("notification_channel", JSON.stringify(payload));

        const userSocketId = await redisClient.hget("online_users", userId);
        if (userSocketId) {
          io.to(userSocketId).emit("receive_notification", payload);
        } else {
          const fcmToken = await redisClient.hget(`fcm_tokens:${userId}`, "token");
          if (fcmToken) {
            await sendPushNotification(fcmToken, {
              title,
              body: message,
              data: { notificationId: notification._id.toString() },
            });
          }
        }
        logger.info(`Notification sent to ${userId}`);
        callback?.({ status: "success", message: "Notification sent." });
      } catch (err) {
        logger.error(`Notification send failed: ${err.message}`);
        callback?.({ status: "error", message: "Failed to send notification." });
      }
    });

    // Disconnect
    socket.on("disconnect", async () => {
      const userId = await removeUser(socket.id);
      if (userId) {
        io.emit("user_status_update", { userId, status: "offline" });
        logger.info(`User ${userId} disconnected (Socket ID: ${socket.id})`);
      }
    });
  });

  return io;
};

module.exports = socketSetup;