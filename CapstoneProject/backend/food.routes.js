const express = require('express');
const router = express.Router();
const foodController = require('./food.controller.js');

// When the front-end makes a GET request to /api/foods/search?query=apple
// it will trigger the searchFoods function in our controller.
router.get('/search', foodController.searchFoods);

module.exports = router;