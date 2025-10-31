const MealLog = require('../models/mealLog.model.js');
const Food = require('../models/food.model.js');
const mongoose = require('mongoose');

// --- *** THIS FUNCTION IS MODIFIED *** ---
async function logMeal(req, res) {
  try {
    const userId = req.user.id;
    // --- Get all new fields from body ---
    const { 
      foodId, mealType, quantity, loggedAt, 
      servingDescription, caloriesPerServing, 
      proteinPerServing, fatPerServing, carbohydratesPerServing 
    } = req.body;

    const foodExists = await Food.findById(foodId);
    if (!foodExists) {
        return res.status(404).json({ error: 'Food not found.' });
    }

    const newMealLog = new MealLog({
      userId,
      foodId,
      mealType,
      quantity,
      loggedAt: loggedAt || new Date(),
      // --- Save all new fields ---
      servingDescription: servingDescription,
      caloriesPerServing: caloriesPerServing,
      proteinPerServing: proteinPerServing,
      fatPerServing: fatPerServing,
      carbohydratesPerServing: carbohydratesPerServing,
    });
    
    await newMealLog.save();
    res.status(201).json({ message: 'Meal logged successfully!', data: newMealLog });

  } catch (error) {
    console.error('Error in logMeal:', error);
    res.status(500).json({ error: 'An error occurred while logging the meal.' });
  }
}
// --- *** END OF MODIFICATION *** ---

// --- *** THIS FUNCTION IS MODIFIED *** ---
async function getCalorieStats(req, res) {
  try {
    const userId = req.user.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userTimeZone = req.query.tz || "America/New_York"; 

    const stats = await MealLog.aggregate([
      { $match: { 
          userId: new mongoose.Types.ObjectId(userId),
          loggedAt: { $gte: thirtyDaysAgo }
        } 
      },
      { $group: {
          _id: { 
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$loggedAt",
              timezone: userTimeZone
            } 
          },
          // --- Aggregate all four nutrients ---
          totalCalories: { 
            $sum: { $multiply: [ "$caloriesPerServing", "$quantity" ] }
          },
          totalProtein: { 
            $sum: { $multiply: [ "$proteinPerServing", "$quantity" ] }
          },
          totalFat: { 
            $sum: { $multiply: [ "$fatPerServing", "$quantity" ] }
          },
          totalCarbs: { 
            $sum: { $multiply: [ "$carbohydratesPerServing", "$quantity" ] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(stats);
  } catch (error) {
    console.error('Error in getCalorieStats:', error);
    res.status(500).json({ error: 'An error occurred while fetching stats.' });
  }
}
// --- *** END OF MODIFICATION *** ---

async function getMealLogs(req, res) {
  try {
    const userId = req.user.id;
    const logs = await MealLog.find({ userId })
      .populate('foodId') 
      .sort({ loggedAt: -1 })
      .limit(20);
    res.json(logs);
  } catch (error) {
    console.error('Error in getMealLogs:', error);
    res.status(500).json({ error: 'An error occurred while fetching meal logs.' });
  }
}

async function updateMealLog(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body; 

    const log = await MealLog.findById(id);
    if (!log) { return res.status(404).json({ error: 'Meal log not found.' }); }
    if (log.userId.toString() !== userId) { return res.status(403).json({ error: 'User not authorized.' }); }

    // When updating a log, we might be changing the quantity
    // But we are NOT changing the underlying food data, so we don't need to update
    // the "perServing" fields. This function is fine as-is.
    Object.assign(log, updates);
    await log.save();

    res.json({ message: 'Meal log updated successfully!', data: log });
  } catch (error) {
    console.error('Error in updateMealLog:', error);
    res.status(500).json({ error: 'An error occurred while updating the meal log.' });
  }
}

async function deleteMealLog(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const log = await MealLog.findById(id);

    if (!log) {
      return res.status(404).json({ error: 'Meal log not found.' });
    }
    if (log.userId.toString() !== userId) {
      return res.status(403).json({ error: 'User not authorized to delete this log.' });
    }

    await MealLog.findByIdAndDelete(id);

    res.status(200).json({ message: 'Meal log deleted successfully.' });
  } catch (error) {
    console.error('Error in deleteMealLog:', error);
    res.status(500).json({ error: 'An error occurred while deleting the meal log.' });
  }
}

module.exports = {
  logMeal,
  getMealLogs,
  getCalorieStats,
  updateMealLog,
  deleteMealLog,
};