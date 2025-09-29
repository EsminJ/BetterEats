const MealLog = require('./mealLog.model.js');
const Food = require('./food.model.js');

async function logMeal(req, res) {
  try {
    // Get the userId from the authenticated session
    const userId = req.user.id; 
    const { foodId, mealType, quantity } = req.body;

    // We no longer need to check if the user exists because the middleware already did.
    const foodExists = await Food.findById(foodId);
    if (!foodExists) {
        return res.status(404).json({ error: 'Food not found.' });
    }

    const newMealLog = new MealLog({ userId, foodId, mealType, quantity });
    await newMealLog.save();
    res.status(201).json({ message: 'Meal logged successfully!', data: newMealLog });

  } catch (error) {
    console.error('Error in logMeal:', error);
    res.status(500).json({ error: 'An error occurred while logging the meal.' });
  }
}

module.exports = {
  logMeal,
}; 