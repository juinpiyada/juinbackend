const multer = require('multer');
const path = require('path');

const uploadDir = path.resolve(__dirname, '../uploads');

// Set up storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename based on time
  },
});

// Validate file types
const validTypes = ['image/jpeg', 'image/png', 'application/pdf']; // Adjust file types as needed

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
}).single('attachment');

module.exports = { upload, uploadDir };
