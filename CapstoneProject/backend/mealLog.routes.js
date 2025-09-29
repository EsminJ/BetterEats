const express = require('express');
const router = express.Router();
const mealLogController = require('./mealLog.controller.js');
const { ensureAuthenticated } = require('../middleware/auth.middleware.js'); // Import the guard

// Add 'ensureAuthenticated' before the controller function.
// so only logged-in users can access this route.
router.post('/', ensureAuthenticated, mealLogController.logMeal);

module.exports = router;