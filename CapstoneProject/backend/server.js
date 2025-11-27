// --- Core Dependencies ---
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

// --- Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 8000; 

// --- Passport Configuration ---
require('./config/passport.config.js')(passport);

// --- Middleware Setup ---

// morgan for request logging
app.use(morgan('dev'));

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {

      callback(null, true);
    },
    credentials: true,
  })
);

// parse JSON
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
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days

    }
  })
);

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.error('MongoDB Connection Error:', err)); // added error logging

// --- API Routes ---
app.use('/api/auth', require('./routes/auth.routes.js'));
app.use('/api/foods', require('./routes/food.routes.js'));
app.use('/api/meallogs', require('./routes/mealLog.routes.js'));
app.use('/api/weightlogs', require('./routes/weightLog.routes.js'));
app.use('/api/ai', require('./routes/ai.routes.js')); // added gemini api 
app.use('/api/user', require('./routes/user.routes.js')); // added user profile page

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});