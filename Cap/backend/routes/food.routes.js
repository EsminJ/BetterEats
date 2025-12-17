const express = require('express');
const router = express.Router();
const foodController = require('../controllers/food.controller.js');
const { ensureAuthenticated } = require('../middleware/auth.middleware');

router.post('/custom', ensureAuthenticated, foodController.createCustomFood);
router.get('/suggest', foodController.suggestFoods);
router.get('/search', foodController.searchFoods);
router.put('/:id', ensureAuthenticated, foodController.updateFood);

module.exports = router;