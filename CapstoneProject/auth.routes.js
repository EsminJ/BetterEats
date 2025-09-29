const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('./user.model.js'); // Your User model

// Register Route
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  // Basic validation would go here

  User.findOne({ email: email }).then(user => {
    if (user) {
      return res.status(400).json({ error: 'Email already exists' });
    } else {
      const newUser = new User({ username, email });

      // Hash Password before saving
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, hash) => {
          if (err) throw err;
          newUser.passwordHash = hash;
          newUser.save()
            .then(user => res.status(201).json({ message: 'User registered successfully!' }))
            .catch(err => console.log(err));
        });
      });
    }
  });
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