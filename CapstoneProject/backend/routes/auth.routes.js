const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/user.model.js');

// Register Route (Updated with robust validation)
router.post('/register', async (req, res) => {
  console.log('Request received for /register:', req.body);
  const { username, email, password } = req.body;

  // --- Start of New, Robust Validation Block ---

  // 1. Check for missing fields
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Please enter all fields' });
  }

  // 2. Check username length
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }

  // 3. Check password length
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  // 4. Validate email format using a regular expression
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  // --- End of New Validation Block ---

  try {
    // 5. Check if email OR username already exists in the database
    const existingUser = await User.findOne({ $or: [{ email: email }, { username: username }] });
    if (existingUser) {
      // Check which field was a duplicate and send a specific error
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Create new user instance
    const newUser = new User({
      username,
      email,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    newUser.passwordHash = hash;

    // Save user to the database
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });

  } catch (err) {
    console.error('REGISTRATION ERROR:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login Route
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) throw err;
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    req.logIn(user, (err) => {
      if (err) throw err;
      res.json({ message: 'Logged in successfully!', user: { id: user.id, username: user.username } });
    });
  })(req, res, next);
});

module.exports = router;