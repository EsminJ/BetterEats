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

const GOALS = ["Lose Weight", "Gain Muscle", "Maintain Weight"]; 

// registration route
router.post('/register', async (req, res) => {
  console.log('Request received for /register:', req.body);
  const {
    username, email, password,
    unit, heightFt, heightIn, heightCm, weightLbs, weightKg, goal
  } = req.body;

  // validation checks
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  // user length
  if (username.length < 3) {
     return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }
  // password length
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  // email format
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
     return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  try {
    // check if email or username already exists
    const existingUser = await User.findOne({ $or: [{ email: email }, { username: username }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    let finalHeightCm = null;
    let finalWeightKg = null;
    const preferredUnit = (unit === 'imperial' || unit === 'metric') ? unit : 'imperial'; 

    if (preferredUnit === 'imperial') {
      finalHeightCm = inToCm(heightFt, heightIn);
      finalWeightKg = lbsToKg(weightLbs);
    } else { 
      finalHeightCm = Number(heightCm) || null;
      finalWeightKg = Number(weightKg) || null;
      if (finalHeightCm !== null && finalHeightCm < 0) finalHeightCm = null; 
      if (finalWeightKg !== null && finalWeightKg < 0) finalWeightKg = null; 
    }

    // create new user instance
    const newUser = new User({
      username,
      email,
      // save profile data
      heightCm: finalHeightCm ? Math.round(finalHeightCm) : undefined, 
      weightKg: finalWeightKg ? Math.round(finalWeightKg) : undefined,
      goal: GOALS.includes(goal) ? goal : undefined, 
      unitPreference: preferredUnit,
    });

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    newUser.passwordHash = hash;

    // save user to database
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });

  } catch (err) {
    console.error('REGISTRATION ERROR:', err);
     if (err.code === 11000) {
       if (err.keyPattern?.username) { return res.status(400).json({ error: 'Username already exists' }); }
       if (err.keyPattern?.email) { return res.status(400).json({ error: 'Email already exists' }); }
       return res.status(400).json({ error: 'Duplicate field error.' });
     }
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// login route
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { usernameField: 'username' }, (err, user, info) => { 
    if (err) return next(err); 
    if (!user) {
      return res.status(400).json({ error: info?.message || 'Invalid credentials' });
    }
    
    // establish session
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.json({
        message: 'Logged in successfully!',
        user: { id: user.id, username: user.username }
      });
    });
  })(req, res, next);
});

// logout route
router.post('/logout', (req, res, next) => {
  req.logout(function(err) { 
    if (err) { return next(err); }
    req.session.destroy((err) => { // destroy session data
        if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).json({ error: 'Could not log out.' });
        }
        res.clearCookie('connect.sid'); // clear session cookie
        res.status(200).json({ message: 'Logged out successfully.' });
    });
  });
});

module.exports = router;