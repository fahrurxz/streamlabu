const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpegService = require('./ffmpeg');
const thumbnailService = require('./thumbnailService');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const videoDir = path.join(uploadsDir, 'videos');
const thumbnailDir = path.join(uploadsDir, 'thumbnails');

// Ensure directories exist
[uploadsDir, videoDir, thumbnailDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videoDir);
  },
  filename: function (req, file, cb) {
    const userId = req.user.id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Keep original extension
    const ext = path.extname(file.originalname);
    cb(null, `user-${userId}-${uniqueSuffix}${ext}`);
  }
});

// File filter for video uploads
const fileFilter = (req, file, cb) => {
  // Accept video files only
  const allowedMimeTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/quicktime'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 500 // 500MB limit
  }
});

// Process video after upload (generate thumbnail, etc.)
const processUploadedVideo = async (file) => {
  try {
    // Generate thumbnail
    const thumbnailPath = await thumbnailService.generateVideoThumbnail(file.path);

    return {
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      thumbnailPath: thumbnailPath,
      size: file.size
    };
  } catch (error) {
    console.error('Error processing uploaded video:', error);
    throw error;
  }
};

module.exports = {
  upload,
  processUploadedVideo,
  videoDir,
  thumbnailDir: thumbnailService.thumbnailDir
};