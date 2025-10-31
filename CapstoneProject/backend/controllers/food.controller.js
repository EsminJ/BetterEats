const axios = require('axios');
const Food = require('../models/food.model.js');

async function searchFoods(req, res) {
  const searchQuery = req.query.query;
  if (!searchQuery) { return res.status(400).json({ error: 'Search query is required.' }); }
  try {
    const cachedFood = await Food.findOne({ name: new RegExp(searchQuery, 'i') });
    if (cachedFood) {
      console.log('Food found in cache!');
      return res.json(cachedFood);
    }

    console.log('Food not in cache. Fetching from USDA API...');
    const apiKey = process.env.USDA_API_KEY;

    // STEP 1: Search for the food to get its ID
    const searchResponse = await axios.get(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${searchQuery}&pageSize=1`);
    
    if (!searchResponse.data.foods || searchResponse.data.foods.length === 0) {
      return res.status(404).json({ error: 'Food not found.' });
    }
    const foodSummary = searchResponse.data.foods[0];
    const fdcId = foodSummary.fdcId;

    // STEP 2: Use the ID to fetch the FULL details
    console.log(`Found fdcId: ${fdcId}. Fetching full details...`);
    const detailsResponse = await axios.get(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`);
    const foodData = detailsResponse.data;

    // --- NEW: ROBUST NUTRIENT PARSING ---
    const baseNutrients = {};
    const nutrientsMap = new Map(foodData.foodNutrients.map(n => [n.nutrient.id, n.amount || 0]));

    // Try parsing by ID first (preferred)
    baseNutrients.calories = nutrientsMap.get(1008) || 0; // 1008 = Energy (KCAL)
    baseNutrients.protein = nutrientsMap.get(1003) || 0; // 1003 = Protein
    baseNutrients.fat = nutrientsMap.get(1004) || 0; // 1004 = Total lipid (fat)
    baseNutrients.carbohydrates = nutrientsMap.get(1005) || 0; // 1005 = Carbohydrate, by difference

    // Fallback: If IDs failed (all are 0), try parsing by Name
    if (baseNutrients.calories === 0 && baseNutrients.protein === 0) {
      console.log('Parsing by ID failed, falling back to parsing by Name...');
      foodData.foodNutrients.forEach(n => {
        if (n.nutrientName === 'Protein' || n.nutrient?.name === 'Protein') baseNutrients.protein = n.amount || 0;
        if (n.nutrientName === 'Total Lipid (fat)' || n.nutrient?.name === 'Total Lipid (fat)') baseNutrients.fat = n.amount || 0;
        if (n.nutrientName === 'Carbohydrate, by difference' || n.nutrient?.name === 'Carbohydrate, by difference') baseNutrients.carbohydrates = n.amount || 0;
        if ((n.nutrientName === 'Energy' || n.nutrient?.name === 'Energy') && (n.unitName === 'KCAL' || n.nutrient?.unitName === 'KCAL')) baseNutrients.calories = n.amount || 0;
      });
    }
    // --- END NEW NUTRIENT LOGIC ---

    // 3. Initialize servings array with the 100g/ml standard
    const standardUnit = foodData.servingSizeUnit || 'g';
    const standardDescription = `100${standardUnit}`;
    const servings = [{
      description: standardDescription,
      nutrients: baseNutrients,
    }];

    // --- NEW: ROBUST PORTION PARSING ---
    const addServing = (description, gramWeight) => {
      const factor = (gramWeight || 100) / 100;
      // Only add if description is valid and not a duplicate 100g/ml entry
      if (description && description.toLowerCase() !== standardDescription.toLowerCase()) {
        servings.push({
          description: description,
          nutrients: {
            calories: (baseNutrients.calories || 0) * factor,
            protein: (baseNutrients.protein || 0) * factor,
            fat: (baseNutrients.fat || 0) * factor,
            carbohydrates: (baseNutrients.carbohydrates || 0) * factor,
          }
        });
      }
    };

    // Check for "Branded" food portions
    if (foodData.foodPortions && Array.isArray(foodData.foodPortions) && foodData.foodPortions.length > 0) {
      console.log('Parsing Branded foodPortions...');
      foodData.foodPortions.forEach(portion => {
        // Find a valid description
        let description = portion.portionDescription || portion.modifier || `${portion.amount || 1} ${portion.measureUnitName || ''}`.trim();
        addServing(description, portion.gramWeight);
      });
    } 
    // Check for "SR Legacy" / "Survey" food measures
    else if (foodData.foodMeasures && Array.isArray(foodData.foodMeasures) && foodData.foodMeasures.length > 0) {
      console.log('Parsing SR Legacy/Survey foodMeasures...');
      foodData.foodMeasures.forEach(measure => {
        const description = `${measure.amount || 1} ${measure.unitName}`.trim();
        addServing(description, measure.gramWeight);
      });
    }
    // --- END NEW PORTION LOGIC ---

    const newFood = new Food({
      fdcId: foodData.fdcId,
      name: foodData.description,
      servings: servings,
    });
    
    await newFood.save();
    res.json(newFood);
  } catch (error) {
    console.error('Error in searchFoods:', error.message);
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