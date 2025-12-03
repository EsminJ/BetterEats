const MealLog = require('../models/mealLog.model.js');
const Food = require('../models/food.model.js');
const User = require('../models/user.model.js');
const mongoose = require('mongoose');
const { calculateMealEffectivenessScore } = require('../utils/mealScoring');

// Derive daily calorie/macro targets from user profile if the client does not send them.
const deriveDailyTargets = (user = {}) => {
  const weightKg = Number(user.weightKg);
  const heightCm = Number(user.heightCm);
  const age = Number(user.age);
  const gender = (user.gender || '').toLowerCase();
  const activityLevel = user.activityLevel || 'Sedentary';

  if ([weightKg, heightCm, age].some((v) => !v || isNaN(v))) return null;

  const activityMap = {
    Sedentary: 1.2,
    'Lightly Active': 1.375,
    'Moderately Active': 1.55,
    'Very Active': 1.725,
  };
  const activityFactor = activityMap[activityLevel] || 1.2;

  // Mifflin-St Jeor
  const genderAdj = gender === 'male' ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + genderAdj;
  let tdee = bmr * activityFactor;

  const goal = (user.goal || '').toLowerCase();
  if (goal.includes('lose')) tdee -= 500;
  else if (goal.includes('gain')) tdee += 250;

  const dailyCalorieTarget = Math.max(1200, Math.round(tdee));

  const proteinPerKg = goal.includes('gain') || goal.includes('lose') ? 1.6 : 1.2;
  const dailyProteinTarget = Math.round(weightKg * proteinPerKg);

  const fatCalories = dailyCalorieTarget * 0.25;
  const dailyFatTarget = Math.round(fatCalories / 9);

  const proteinCalories = dailyProteinTarget * 4;
  const carbCalories = Math.max(dailyCalorieTarget - fatCalories - proteinCalories, 0);
  const dailyCarbTarget = Math.round(carbCalories / 4);

  return {
    dailyCalorieTarget,
    dailyProteinTarget,
    dailyFatTarget,
    dailyCarbTarget,
  };
};

// meal logger
async function logMeal(req, res) {
  try {
    const userId = req.user.id;
    const { 
      foodId, mealType, quantity, loggedAt, 
      servingDescription, caloriesPerServing, 
      proteinPerServing, fatPerServing, carbohydratesPerServing,
      dailyCalorieTarget, dailyProteinTarget, dailyFatTarget, dailyCarbTarget,
      goal: goalOverride,
    } = req.body;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const foodExists = await Food.findById(foodId);
    if (!foodExists) {
        return res.status(404).json({ error: 'Food not found.' });
    }

    const parsedQty = Number(quantity);
    const qty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;
    const totalCalories = (Number(caloriesPerServing) || 0) * qty;
    const totalProtein = (Number(proteinPerServing) || 0) * qty;
    const totalFat = (Number(fatPerServing) || 0) * qty;
    const totalCarbs = (Number(carbohydratesPerServing) || 0) * qty;

    const providedTargets = {
      dailyCalorieTarget: Number(dailyCalorieTarget),
      dailyProteinTarget: Number(dailyProteinTarget),
      dailyFatTarget: Number(dailyFatTarget),
      dailyCarbTarget: Number(dailyCarbTarget),
    };
    const hasProvidedTargets = Object.values(providedTargets).every((v) => v && v > 0);
    const derivedTargets = deriveDailyTargets(user);
    const targets = hasProvidedTargets ? providedTargets : derivedTargets;
    const hasTargets = targets && Object.values(targets).every((v) => v && v > 0);

    let scoringResult = null;
    if (hasTargets && totalCalories > 0) {
      scoringResult = calculateMealEffectivenessScore({
        goal: goalOverride || user.goal,
        dailyCalorieTarget: targets.dailyCalorieTarget,
        dailyProteinTarget: targets.dailyProteinTarget,
        dailyFatTarget: targets.dailyFatTarget,
        dailyCarbTarget: targets.dailyCarbTarget,
        mealCalories: totalCalories,
        mealProteinG: totalProtein,
        mealFatG: totalFat,
        mealCarbsG: totalCarbs,
        mealType,
      });
    }

    const newMealLog = new MealLog({
      userId,
      foodId,
      mealType,
      quantity: qty,
      loggedAt: loggedAt || new Date(),

      // save new meal data
      servingDescription: servingDescription,
      caloriesPerServing: caloriesPerServing,
      proteinPerServing: proteinPerServing,
      fatPerServing: fatPerServing,
      carbohydratesPerServing: carbohydratesPerServing,
      ...(scoringResult
        ? {
            mealEffectivenessScore: scoringResult.meal_effectiveness_score,
            scoreGrade: scoringResult.score_grade,
            scoreBreakdown: scoringResult.score_breakdown,
            scoreExplanation: scoringResult.explanation,
          }
        : {}),
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
    const [user, logs] = await Promise.all([
      User.findById(userId).lean(),
      MealLog.find({ userId })
        .populate('foodId') 
        .sort({ loggedAt: -1 })
        .limit(50)
    ]);

    const targets = deriveDailyTargets(user);

    const scoredLogs = logs.map((log) => {
      const obj = log.toObject();
      const qty = Number(obj.quantity) || 1;
      const totalCalories = (Number(obj.caloriesPerServing) || 0) * qty;
      const totalProtein = (Number(obj.proteinPerServing) || 0) * qty;
      const totalFat = (Number(obj.fatPerServing) || 0) * qty;
      const totalCarbs = (Number(obj.carbohydratesPerServing) || 0) * qty;

      if (!obj.mealEffectivenessScore && targets && totalCalories > 0) {
        const scoringResult = calculateMealEffectivenessScore({
          goal: user?.goal,
          dailyCalorieTarget: targets.dailyCalorieTarget,
          dailyProteinTarget: targets.dailyProteinTarget,
          dailyFatTarget: targets.dailyFatTarget,
          dailyCarbTarget: targets.dailyCarbTarget,
          mealCalories: totalCalories,
          mealProteinG: totalProtein,
          mealFatG: totalFat,
          mealCarbsG: totalCarbs,
          mealType: obj.mealType,
        });

        if (scoringResult) {
          obj.mealEffectivenessScore = scoringResult.meal_effectiveness_score;
          obj.scoreGrade = scoringResult.score_grade;
          obj.scoreBreakdown = scoringResult.score_breakdown;
          obj.scoreExplanation = scoringResult.explanation;
        }
      }

      return obj;
    });

    res.json(scoredLogs);
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
