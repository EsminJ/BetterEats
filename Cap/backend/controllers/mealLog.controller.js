const MealLog = require('../models/mealLog.model.js');
const Food = require('../models/food.model.js');
const mongoose = require('mongoose');

// meal logger
async function logMeal(req, res) {
  try {
    const userId = req.user.id;
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

      // save new meal data
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

// get calorie stats, 1 day, 1 week, 1 month, 1 year ranges
async function getCalorieStats(req, res) {
  try {
    const userId = req.user.id;
    const { startDate, endDate, range, tz } = req.query; 
    const userTimeZone = tz || "America/New_York";

    // Use provided dates, or default to 7 days ago if missing
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = endDate ? new Date(endDate) : new Date();

    // Ensure we capture the full end day
    end.setHours(23, 59, 59, 999);

    let groupByFormat = "%Y-%m-%d"; // Default daily

    if (range === '1y') {
      groupByFormat = "%Y-%m"; // Group by month for yearly view
    }

    const stats = await MealLog.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId),
          loggedAt: { $gte: start, $lte: end } // Explicit window
        } 
      },
      { 
        $group: {
          _id: { 
            $dateToString: { 
              format: groupByFormat, 
              date: "$loggedAt",
              timezone: userTimeZone
            } 
          },
          // aggregate totals
          totalCalories: { $sum: { $multiply: [ "$caloriesPerServing", "$quantity" ] } },
          totalProtein: { $sum: { $multiply: [ "$proteinPerServing", "$quantity" ] } },
          totalFat: { $sum: { $multiply: [ "$fatPerServing", "$quantity" ] } },
          totalCarbs: { $sum: { $multiply: [ "$carbohydratesPerServing", "$quantity" ] } }
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

// get all meal logs for a user
async function getMealLogs(req, res) {
  try {
    const userId = req.user.id;
    const logs = await MealLog.find({ userId })
      .populate('foodId') 
      .sort({ loggedAt: -1 })
      .limit(50);
    res.json(logs);
  } catch (error) {
    console.error('Error in getMealLogs:', error);
    res.status(500).json({ error: 'An error occurred while fetching meal logs.' });
  }
}

// update a meal log
async function updateMealLog(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body; 

    const log = await MealLog.findById(id);
    if (!log) { return res.status(404).json({ error: 'Meal log not found.' }); }
    if (log.userId.toString() !== userId) { return res.status(403).json({ error: 'User not authorized.' }); }

    Object.assign(log, updates);
    await log.save();

    res.json({ message: 'Meal log updated successfully!', data: log });
  } catch (error) {
    console.error('Error in updateMealLog:', error);
    res.status(500).json({ error: 'An error occurred while updating the meal log.' });
  }
}

// remove a meal log
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