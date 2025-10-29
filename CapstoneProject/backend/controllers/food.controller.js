const axios = require('axios');
const Food = require('../models/food.model.js');

async function searchFoods(req, res) {
  const searchQuery = req.query.query;
  if (!searchQuery) { return res.status(400).json({ error: 'Search query is required.' }); }
  try {
    const cachedFood = await Food.findOne({ name: new RegExp(searchQuery, 'i') });
    if (cachedFood) { return res.json(cachedFood); }

    const apiKey = process.env.USDA_API_KEY;
    const usdaResponse = await axios.get(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${searchQuery}&pageSize=1`);
    const foodData = usdaResponse.data.foods[0];
    if (!foodData) { return res.status(404).json({ error: 'Food not found.' }); }

    const baseNutrients = {};
    foodData.foodNutrients.forEach(n => {
      if (n.nutrientName === 'Protein') baseNutrients.protein = n.value || 0;
      if (n.nutrientName === 'Total Lipid (fat)') baseNutrients.fat = n.value || 0;
      if (n.nutrientName === 'Carbohydrate, by difference') baseNutrients.carbohydrates = n.value || 0;
      if (n.nutrientName === 'Energy' && n.unitName === 'KCAL') baseNutrients.calories = n.value || 0;
    });

    const servings = [{
      description: `100${foodData.servingSizeUnit || 'g'}`,
      nutrients: baseNutrients,
    }];

    if (foodData.foodPortions && Array.isArray(foodData.foodPortions)) {
      foodData.foodPortions.forEach(portion => {
        const factor = (portion.gramWeight || 100) / 100;
        servings.push({
          description: portion.portionDescription || '1 serving',
          nutrients: {
            calories: (baseNutrients.calories || 0) * factor,
            protein: (baseNutrients.protein || 0) * factor,
            fat: (baseNutrients.fat || 0) * factor,
            carbohydrates: (baseNutrients.carbohydrates || 0) * factor,
          }
        });
      });
    }

    const newFood = new Food({
      fdcId: foodData.fdcId,
      name: foodData.description,
      servings: servings,
    });
    
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
      servings: [{
        description: '1 serving',
        nutrients: {
          calories: nutrients.calories || 0,
          protein: nutrients.protein || 0,
          fat: nutrients.fat || 0,
          carbohydrates: nutrients.carbohydrates || 0,
        }
      }],
      isCustom: true,
      createdBy: userId,
    });

    await newFood.save();
    res.status(201).json(newFood);
  } catch (error) {
    console.error('Error in createCustomFood:', error);
    res.status(500).json({ error: 'An error occurred while creating the food.' });
  }
}

async function updateFood(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, servings } = req.body;

    const originalFood = await Food.findById(id);
    if (!originalFood) {
      return res.status(404).json({ error: 'Food not found.' });
    }

    if (originalFood.isCustom && originalFood.createdBy.toString() === userId) {
      originalFood.name = name;
      originalFood.servings = servings;
      await originalFood.save();
      return res.json(originalFood);
    } 
    else {
      const newCustomFood = new Food({
        name,
        servings,
        isCustom: true,
        createdBy: userId,
      });
      await newCustomFood.save();
      return res.status(201).json(newCustomFood);
    }
  } catch (error) {
    console.error('Error in updateFood:', error);
    res.status(500).json({ error: 'An error occurred while updating the food.' });
  }
}

module.exports = {
  searchFoods,
  suggestFoods,
  createCustomFood,
  updateFood,
};