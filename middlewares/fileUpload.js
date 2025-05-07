const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Multer upload instance
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      !file.mimetype.startsWith("image/") && // Allow images
      !file.mimetype.startsWith("video/")   // Allow videos
    )
      {
      return cb(new Error("Only image and video files are allowed!"), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // Limit file size to 10MB
  },
});

module.exports = upload;
