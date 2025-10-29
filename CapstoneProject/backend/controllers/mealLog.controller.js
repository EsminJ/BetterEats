const MealLog = require('../models/mealLog.model.js');
const Food = require('../models/food.model.js');
const mongoose = require('mongoose');

async function logMeal(req, res) {
  try {
    const userId = req.user.id;
    // Now accepting an optional 'loggedAt' field from the request body
    const { foodId, mealType, quantity, loggedAt } = req.body;

    const foodExists = await Food.findById(foodId);
    if (!foodExists) {
      return res.status(404).json({ error: 'Food not found.' });
    }

    const newMealLog = new MealLog({
      userId,
      foodId,
      mealType,
      quantity,
      loggedAt: loggedAt || new Date(), // Use provided date or default to now
    });

    await newMealLog.save();
    res.status(201).json({ message: 'Meal logged successfully!', data: newMealLog });

  } catch (error) {
    console.error('Error in logMeal:', error);
    res.status(500).json({ error: 'An error occurred while logging the meal.' });
  }
}

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

async function getCalorieStats(req, res) {
  try {
    const userId = req.user.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await MealLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), loggedAt: { $gte: thirtyDaysAgo } } },
      { $lookup: { from: 'foods', localField: 'foodId', foreignField: '_id', as: 'foodDetails' } },
      { $unwind: '$foodDetails' },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$loggedAt" } },
          totalCalories: {
            $sum: {
              // Use the calories from the *first serving* in the array
              $multiply: [ { $arrayElemAt: ["$foodDetails.servings.nutrients.calories", 0] }, "$quantity" ]
            }
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

// --- New function to update an existing meal log ---
async function updateMealLog(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { loggedAt } = req.body;

    if (!loggedAt) {
      return res.status(400).json({ error: 'loggedAt date is required.' });
    }

    const log = await MealLog.findById(id);

    if (!log) {
      return res.status(404).json({ error: 'Meal log not found.' });
    }
    if (log.userId.toString() !== userId) {
      return res.status(403).json({ error: 'User not authorized to edit this log.' });
    }

    log.loggedAt = loggedAt;
    await log.save();

    res.json({ message: 'Meal log updated successfully!', data: log });
  } catch (error) {
    console.error('Error in updateMealLog:', error);
    res.status(500).json({ error: 'An error occurred while updating the meal log.' });
  }
}

async function updateMealLog(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body; // Can contain { loggedAt, foodId, quantity, mealType }

    const log = await MealLog.findById(id);
    if (!log) { return res.status(404).json({ error: 'Meal log not found.' }); }
    if (log.userId.toString() !== userId) { return res.status(403).json({ error: 'User not authorized.' }); }

    // Update the log with any fields provided in the request body
    Object.assign(log, updates);
    await log.save();

    res.json({ message: 'Meal log updated successfully!', data: log });
  } catch (error) {
    console.error('Error in updateMealLog:', error);
    res.status(500).json({ error: 'An error occurred while updating the meal log.' });
  }
}

// --- New function to delete a meal log ---
async function deleteMealLog(req, res) {
  try {
    const { id } = req.params; // The ID of the log to delete
    const userId = req.user.id;

    const log = await MealLog.findById(id);

    if (!log) {
      return res.status(404).json({ error: 'Meal log not found.' });
    }
    // Security check: ensure the user owns this log before deleting
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