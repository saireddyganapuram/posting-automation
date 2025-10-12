const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', process.env.CLIENT_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

// Serve static files (generated images)
app.use('/uploads', express.static('uploads'));

app.use(session({
  secret: process.env.JWT_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Important for OAuth flows
  },
  name: 'twitter.scheduler.sid' // Custom session name
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/linkedin', require('./routes/linkedin'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/posts', require('./routes/tweets'));
app.use('/api/business', require('./routes/business'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// LinkedIn post scheduler - runs every minute
cron.schedule('* * * * *', async () => {
  console.log('Cron job triggered at:', new Date().toISOString());
  const { checkAndPostScheduledPosts } = require('./services/tweetScheduler');
  await checkAndPostScheduledPosts();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});