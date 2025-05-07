const express = require("express");
const { getUserNotifications, markAsRead, deleteNotification } = require("../controllers/notificationController");
const { verifyToken } = require("../middlewares/verifyToken");
const router = express.Router();

router.get("/", verifyToken, getUserNotifications);
router.patch("/:id/read", verifyToken, markAsRead);
router.delete("/:id", verifyToken, deleteNotification);

module.exports = router;
