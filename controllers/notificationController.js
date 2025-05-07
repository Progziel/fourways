const Notification = require("../models/Notification");

const getUserNotifications = async (req, res) => {
    try {
      const notifications = await Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 });
  
      if (!notifications.length) {
        return res.status(404).json({ 
          success: false, 
          message: "No notifications found" 
        });
      }
  
      res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Error fetching notifications",
        error: err.message,
      });
    }
  };
  
const markAsRead = async (req, res) => {
    try {
      const notification = await Notification.findByIdAndUpdate(
        req.params.id,
        { isRead: true },
        { new: true } // Return the updated document
      );
  
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }
  
      res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Error updating notification",
        error: err.message,
      });
    }
  };

const deleteNotification = async (req, res) => {
    try {
      const notification = await Notification.findByIdAndDelete(req.params.id);
  
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }
  
      res.status(200).json({
        success: true,
        message: "Notification deleted successfully",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Error deleting notification",
        error: err.message,
      });
    }
  };
  

module.exports = {
    getUserNotifications,
    markAsRead,
    deleteNotification
};
