const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller.js');
const { ensureAuthenticated } = require('../middleware/auth.middleware.js');

// GET current user profile
router.get('/profile', ensureAuthenticated, userController.getUserProfile);

// PUT update user goal
router.put('/goal', ensureAuthenticated, userController.updateUserGoal);

module.exports = router;