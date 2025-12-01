const express = require('express');
const router = express.Router();
const mealLogController = require('../controllers/mealLog.controller.js');
const { ensureAuthenticated } = require('../middleware/auth.middleware.js');

// POST a new meal log
router.post('/', ensureAuthenticated, mealLogController.logMeal);

// GET the user's meal log history
router.get('/', ensureAuthenticated, mealLogController.getMealLogs);

// GET the user's calorie statistics
router.get('/stats', ensureAuthenticated, mealLogController.getCalorieStats);

// PUT a specific meal log by its ID
router.put('/:id', ensureAuthenticated, mealLogController.updateMealLog);

// DELETE a specific meal log by its ID
router.delete('/:id', ensureAuthenticated, mealLogController.deleteMealLog);

module.exports = router;