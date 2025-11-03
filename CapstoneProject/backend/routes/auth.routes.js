const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/user.model.js');

// helper functions for unit conversion
const inToCm = (ft, inch) => {
  // ensure inputs are treated as numbers
  const feet = Number(ft) || 0;
  const inches = Number(inch) || 0;
  if (feet < 0 || inches < 0 || inches >= 12) return null; 
  return (feet * 12 + inches) * 2.54;
};
const lbsToKg = (lbs) => {
  const pounds = Number(lbs) || 0;
  if (pounds < 0) return null; 
  return pounds * 0.45359237;
};
// --- End Helper Functions ---

// --- Define GOALS constant ---
const GOALS = ["Lose Weight", "Gain Muscle", "Maintain Weight"]; // Define the allowed goals

// Register Route
router.post('/register', async (req, res) => {
  console.log('Request received for /register:', req.body);
  // Destructure all expected fields from the request body
  const {
    username, email, password,
    unit, heightFt, heightIn, heightCm, weightLbs, weightKg, goal
  } = req.body;

  // --- START: Validation Checks ---
  // 1. Check for mandatory fields
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  // 2. Check username length
  if (username.length < 3) {
     return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }
  // 3. Check password length
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  // 4. Validate email format
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
     return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  // --- END: Validation Checks ---

  try {
    // 5. Check if email OR username already exists
    const existingUser = await User.findOne({ $or: [{ email: email }, { username: username }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // --- Calculate standardized height and weight ---
    let finalHeightCm = null;
    let finalWeightKg = null;
    const preferredUnit = (unit === 'imperial' || unit === 'metric') ? unit : 'imperial'; // Default to imperial if invalid

    if (preferredUnit === 'imperial') {
      finalHeightCm = inToCm(heightFt, heightIn);
      finalWeightKg = lbsToKg(weightLbs);
    } else { // unit === 'metric'
      finalHeightCm = Number(heightCm) || null;
      finalWeightKg = Number(weightKg) || null;
      if (finalHeightCm !== null && finalHeightCm < 0) finalHeightCm = null; // Ensure non-negative
      if (finalWeightKg !== null && finalWeightKg < 0) finalWeightKg = null; // Ensure non-negative
    }
    // --- End calculation ---

    // 6. Create new user instance
    const newUser = new User({
      username,
      email,
      // Save profile data (use null if conversion failed or input was invalid)
      heightCm: finalHeightCm ? Math.round(finalHeightCm) : undefined, // Store as rounded number or undefined
      weightKg: finalWeightKg ? Math.round(finalWeightKg) : undefined, // Store as rounded number or undefined
      goal: GOALS.includes(goal) ? goal : undefined, // Validate goal against allowed values
      unitPreference: preferredUnit,
    });

    // 7. Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    newUser.passwordHash = hash;

    // 8. Save user to the database
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });

  } catch (err) {
    console.error('REGISTRATION ERROR:', err);
     // More specific check for MongoDB duplicate key errors (just in case)
     if (err.code === 11000) {
       if (err.keyPattern?.username) { return res.status(400).json({ error: 'Username already exists' }); }
       if (err.keyPattern?.email) { return res.status(400).json({ error: 'Email already exists' }); }
       // Fallback duplicate error
       return res.status(400).json({ error: 'Duplicate field error.' });
     }
    // General server error
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login Route
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { usernameField: 'username' }, (err, user, info) => { // Ensure usernameField is set
    if (err) return next(err); // Pass server errors to Express error handler
    if (!user) {
      // Use the specific message from Passport if available (e.g., 'Password incorrect')
      return res.status(400).json({ error: info?.message || 'Invalid credentials' });
    }
    
    // Establish session
    req.logIn(user, (err) => {
      if (err) return next(err);
      // Send back only non-sensitive user info
      res.json({
        message: 'Logged in successfully!',
        user: { id: user.id, username: user.username } // Only send id and username
      });
    });
  })(req, res, next); // Don't forget to call the middleware returned by passport.authenticate
});

// Logout Route (Optional but Recommended)
router.post('/logout', (req, res, next) => {
  req.logout(function(err) { // req.logout requires a callback
    if (err) { return next(err); }
    req.session.destroy((err) => { // Destroy the session data
        if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).json({ error: 'Could not log out.' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.status(200).json({ message: 'Logged out successfully.' });
    });
  });
});

module.exports = router;