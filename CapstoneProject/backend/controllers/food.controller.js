const axios = require('axios');
const Food = require('../models/food.model.js');

async function searchFoods(req, res) {
  const searchQuery = req.query.query;
  if (!searchQuery) {
    return res.status(400).json({ error: 'Search query is required.' });
  }
  try {
    const cachedFood = await Food.findOne({ name: new RegExp(searchQuery, 'i') });
    if (cachedFood) { return res.json(cachedFood); }

    const apiKey = process.env.USDA_API_KEY;
    const usdaResponse = await axios.get(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${searchQuery}&pageSize=1`);
    const foodData = usdaResponse.data.foods[0];
    if (!foodData) { return res.status(404).json({ error: 'Food not found.' }); }

    const nutrients = {};
    foodData.foodNutrients.forEach(n => {
      if (n.nutrientName === 'Protein') nutrients.protein = n.value;
      if (n.nutrientName === 'Total Lipid (fat)') nutrients.fat = n.value;
      if (n.nutrientName === 'Carbohydrate, by difference') nutrients.carbohydrates = n.value;
      if (n.nutrientName === 'Energy' && n.unitName === 'KCAL') nutrients.calories = n.value;
    });

    const cleanFoodData = {
      fdcId: foodData.fdcId,
      name: foodData.description,
      nutrients: {
        calories: nutrients.calories || 0,
        protein: nutrients.protein || 0,
        fat: nutrients.fat || 0,
        carbohydrates: nutrients.carbohydrates || 0,
      }
    };
    const newFood = new Food(cleanFoodData);
    await newFood.save();
    res.json(newFood);
  } catch (error) {
    console.error('Error in searchFoods:', error);
    res.status(500).json({ error: 'An error occurred while fetching food data.' });
  }
}

async function suggestFoods(req, res) {
  const searchQuery = req.query.query;
  if (!searchQuery) {
    return res.status(400).json({ error: 'Search query is required.' });
  }
  try {
    const apiKey = process.env.USDA_API_KEY;
    const usdaResponse = await axios.get(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${searchQuery}&pageSize=10`);
    if (!usdaResponse.data.foods || usdaResponse.data.foods.length === 0) {
      return res.json([]);
    }
    const suggestions = usdaResponse.data.foods.map(food => ({
      fdcId: food.fdcId,
      name: food.description,
    }));
    res.json(suggestions);
  } catch (error) {
    console.error('Error in suggestFoods:', error);
    res.status(500).json({ error: 'An error occurred while fetching suggestions.' });
  }
}

async function createCustomFood(req, res) {
  try {
    const userId = req.user.id;
    const { name, nutrients } = req.body;

    if (!name || !nutrients || nutrients.calories == null) {
      return res.status(400).json({ error: 'Food name and calories are required.' });
    }

    const newFood = new Food({
      name,
      nutrients: {
        calories: nutrients.calories || 0,
        protein: nutrients.protein || 0,
        fat: nutrients.fat || 0,
        carbohydrates: nutrients.carbohydrates || 0,
      },
      isCustom: true,
      createdBy: userId,
    });

    await newFood.save();
    res.status(201).json(newFood);
  } catch (error) {
    // --- THIS BLOCK IS UPDATED ---
    console.error('CRITICAL ERROR in createCustomFood:', error); // Log the full error on the server
    // Send the specific error message back to the frontend for debugging
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  searchFoods,
  suggestFoods,
  createCustomFood,
};