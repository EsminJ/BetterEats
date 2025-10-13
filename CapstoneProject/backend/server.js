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
const PORT = process.env.PORT || 8000;

// --- Passport Configuration ---
require('./config/passport.config.js')(passport);

// --- Middleware Setup ---

// Use morgan for request logging
app.use(morgan('dev'));

// FINAL, MORE FLEXIBLE CORS CONFIGURATION
app.use(
  cors({
    // Use a function for the origin to be more permissive during development
    origin: (origin, callback) => {
      // In production, you would check against a list of allowed domains.
      // For local development, this allows requests from mobile apps (which can have a null origin).
      callback(null, true);
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
    secret: process.env.SESSION_SECRET || 'a_default_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 
    }
  })
);

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.error(err));

// --- API Routes ---
app.use('/api/auth', require('./routes/auth.routes.js'));
app.use('/api/foods', require('./routes/food.routes.js'));
app.use('/api/meallogs', require('./routes/mealLog.routes.js'));

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});