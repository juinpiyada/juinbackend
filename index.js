require('dotenv').config();  // Load environment variables from a .env file
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');  // Import Multer for file uploads

// Correct path to the upload directory for static file serving
const { uploadDir } = require('./middleware/upload');

// Routes for your app
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const issueRoutes = require('./routes/issues');
const conversationRoutes = require('./routes/conversations');

const app = express();
const PORT = process.env.PORT || 9091;

// CORS Configuration
// Allow all origins to access the backend
app.use(cors({ origin: '*' }));  // This line allows all requests from any origin

// Multer Configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);  // Define the directory to store files
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));  // Filename with timestamp
  }
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploaded content (e.g., images, files)
app.use('/uploads', express.static(path.resolve(uploadDir)));

// Routes for different APIs (auth, users, issues, etc.)
app.use(authRoutes);
app.use(userRoutes);
app.use(issueRoutes);
app.use(conversationRoutes);

// Root route for health check or general info
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'IssueTracker API (PostgreSQL)' }));

// POST Route to handle file uploads (Example)
app.post('/upload', upload.single('attachment'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  }
  return res.status(200).json({ status: 'ok', message: 'File uploaded successfully', filename: req.file.filename });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on https://juinbackend.vercel.app:${PORT}`);
});
