const express = require('express');
const router = express.Router();
const weightLogController = require('../controllers/weightLog.controller.js');
const { ensureAuthenticated } = require('../middleware/auth.middleware.js');

// POST a new weight log
router.post('/', ensureAuthenticated, weightLogController.logWeight);

// GET weight log history
router.get('/', ensureAuthenticated, weightLogController.getWeightLogs);

// GET aggregated weight stats
router.get('/stats', ensureAuthenticated, weightLogController.getWeightStats);

// Update a weight log
router.put('/:id', ensureAuthenticated, weightLogController.updateWeightLog);

// Delete a weight log
router.delete('/:id', ensureAuthenticated, weightLogController.deleteWeightLog);

module.exports = router;
