const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller.js');
const { ensureAuthenticated } = require('../middleware/auth.middleware.js');

// GET /api/ai/suggestion
// Fetches all user data and returns a Gemini-powered suggestion
router.get('/suggestion', ensureAuthenticated, aiController.getAiSuggestion);

module.exports = router;