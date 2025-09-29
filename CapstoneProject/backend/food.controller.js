const axios = require('axios');
const Food = require('./food.model.js'); // Mongoose model for the 'foods' collection

// This is the main function that will be triggered by our route
async function searchFoods(req, res) {
  // 1. Get the search query from the front-end (e.g., "apple")
  const searchQuery = req.query.query;

  if (!searchQuery) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  try {
    // 2. First, check if we already have this food in our own database (cache)
    // We use a regular expression for a case-insensitive search
    const cachedFood = await Food.findOne({ name: new RegExp(searchQuery, 'i') });

    if (cachedFood) {
      console.log('Food found in cache!');
      // If we find it, we return it immediately without calling the USDA API
      return res.json(cachedFood);
    }

    console.log('Food not in cache. Fetching from USDA API...');
    // 3. If NOT in cache, call the USDA API
    const apiKey = process.env.USDA_API_KEY;
    const usdaResponse = await axios.get(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${searchQuery}&pageSize=1`);

    const foodData = usdaResponse.data.foods[0]; // Get the first result

    if (!foodData) {
      return res.status(404).json({ error: 'Food not found.' });
    }

    // 4. Clean the raw data, extracting only what we need
    // The nutrient data is in a nested array, so we have to find the ones we want
    const nutrients = {};
    foodData.foodNutrients.forEach(n => {
      if (n.nutrientName === 'Protein') nutrients.protein = n.value;
      if (n.nutrientName === 'Total Lipid (fat)') nutrients.fat = n.value;
      if (n.nutrientName === 'Carbohydrate, by difference') nutrients.carbohydrates = n.value;
      if (n.nutrientName === 'Energy' && n.unitName === 'KCAL') nutrients.calories = n.value;
    });

    const cleanFoodData = {
      fdcId: foodData.fdcId, // Store the USDA ID
      name: foodData.description,
      nutrients: {
        calories: nutrients.calories || 0,
        protein: nutrients.protein || 0,
        fat: nutrients.fat || 0,
        carbohydrates: nutrients.carbohydrates || 0,
      }
    };

    // 5. Save the clean data to our MongoDB cache for next time
    const newFood = new Food(cleanFoodData);
    await newFood.save();

    // 6. Return the clean data to the front-end
    res.json(newFood);

  } catch (error) {
    console.error('Error in searchFoods:', error);
    res.status(500).json({ error: 'An error occurred while fetching food data.' });
  }
}

module.exports = {
  searchFoods,
};