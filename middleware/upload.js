const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set the upload directory
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

// Ensure the upload directory exists, if not create it
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Set the destination for file storage
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate a unique filename using timestamp + original name
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Set up the file filter (optional)
const fileFilter = (_req, file, cb) => {
  // Allow only image files (you can modify this as needed)
  const allowedTypes = /jpeg|jpg|png|gif/;
  const mimeType = allowedTypes.test(file.mimetype);
  if (mimeType) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

// Set up multer options with size limit and file filter
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB size limit (can be adjusted as needed)
  }
});

module.exports = { upload, uploadDir };
