require('dotenv').config();
// Correct path to the db.js

const express = require('express');
const cors = require('cors');
const path = require('path');

const { uploadDir } = require('./middleware/upload');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const issueRoutes = require('./routes/issues');
const conversationRoutes = require('./routes/conversations');

const app = express();
const PORT = process.env.PORT || 9091;

// Allow CORS from any origin
app.use(cors({ origin: '*' }));  // This line allows all requests from any origin
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads
app.use('/uploads', express.static(path.resolve(uploadDir)));

// Use routes
app.use(authRoutes);
app.use(userRoutes);
app.use(issueRoutes);
app.use(conversationRoutes);

// Root route
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'IssueTracker API (PostgreSQL)' }));

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on https://juinbackend.vercel.app`);
});

