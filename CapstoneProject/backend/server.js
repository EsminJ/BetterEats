// --- Core Dependencies ---
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// --- Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 8000; // Updated port

// --- Passport Configuration ---
require('./config/passport.config.js')(passport);

// --- Middleware Setup ---

// Use morgan for request logging
app.use(morgan('dev'));

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from mobile apps (null origin) and specific origins if needed
      // For development, allowing all is often easier:
      callback(null, true);
      // In production, restrict this:
      // const allowedOrigins = ['YOUR_APP_URL_HERE', 'YOUR_EXPO_GO_URL_IF_NEEDED'];
      // if (allowedOrigins.includes(origin) || !origin) {
      //   callback(null, true);
      // } else {
      //   callback(new Error('Not allowed by CORS'));
      // }
    },
    credentials: true,
  })
);

// To parse JSON bodies from front-end requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Session Middleware ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'a_default_secret_key_longer_than_this',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // e.g., 7 days
        // secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (requires HTTPS)
        // httpOnly: true, // Prevent client-side JS from accessing the cookie
        // sameSite: 'lax' // Recommended for CSRF protection
    }
  })
);

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.error('MongoDB Connection Error:', err)); // Added error logging

// --- API Routes ---
app.use('/api/auth', require('./routes/auth.routes.js'));
app.use('/api/foods', require('./routes/food.routes.js'));
app.use('/api/meallogs', require('./routes/mealLog.routes.js'));
app.use('/api/weightlogs', require('./routes/weightLog.routes.js')); // Added weight log route

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});