const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const logger = require("../utils/logger");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

const sendPushNotification = async (deviceToken, payload) => {

  if(!deviceToken || deviceToken.length ===0) return logger.info("No device token found");

  try {
    const message = {
      token: deviceToken, 
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {}, // Optional custom data
    };
    const response = await messaging.send(message);
    logger.info(`Push notification sent: ${response}`);
    return response;
  } catch (error) {
    logger.error(`Error sending push notification: ${error.message}`);
    throw error;
  }
};

module.exports = { sendPushNotification };