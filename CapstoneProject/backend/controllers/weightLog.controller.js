const WeightLog = require('../models/weightLog.model.js');
const mongoose = require('mongoose');

async function logWeight(req, res) {
  try {
    const userId = req.user.id;
    const { weight, unit, loggedAt } = req.body;

    if (!weight || weight <= 0) { return res.status(400).json({ error: 'Please enter a valid weight.' }); }
    const validUnit = unit === 'lbs' || unit === 'kg';
    if (!validUnit) { return res.status(400).json({ error: 'Invalid unit specified. Use lbs or kg.' }); }

    const newWeightLog = new WeightLog({
      userId, weight: parseFloat(weight), unit: unit,
      loggedAt: loggedAt || new Date(),
    });
    await newWeightLog.save();
    res.status(201).json({ message: 'Weight logged successfully!', data: newWeightLog });
  } catch (error) {
    console.error('Error in logWeight:', error);
    res.status(500).json({ error: 'An error occurred while logging weight.' });
  }
}

async function getWeightLogs(req, res) {
  try {
    const userId = req.user.id;
    const logs = await WeightLog.find({ userId })
      .sort({ loggedAt: -1 })
      .limit(20);
    res.json(logs);
  } catch (error) {
    console.error('Error in getWeightLogs:', error);
    res.status(500).json({ error: 'An error occurred while fetching weight logs.' });
  }
}

// --- THIS FUNCTION IS NOW UPDATED ---
async function getWeightStats(req, res) {
  try {
    const userId = req.user.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await WeightLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), loggedAt: { $gte: thirtyDaysAgo } } },
      
      // --- New Stage: Convert all weights to KG ---
      {
        $project: {
          loggedAt: 1, // Keep the loggedAt date
          // Use $cond to check the unit and convert if necessary
          weightInKg: {
            $cond: {
              if: { $eq: ["$unit", "lbs"] },
              then: { $multiply: ["$weight", 0.45359237] }, // Convert lbs to kg
              else: "$weight" // Already in kg
            }
          }
        }
      },
      // --- End New Stage ---

      // Group by date and average the new weightInKg field
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$loggedAt" } },
          // Rename output field to be clear it's in KG
          averageWeightKg: { $avg: "$weightInKg" } 
        }
      },
      { $sort: { _id: 1 } } // Sort by date ascending
    ]);
    
    res.json(stats);
  } catch (error) {
    console.error('Error in getWeightStats:', error);
    res.status(500).json({ error: 'An error occurred while fetching weight stats.' });
  }
}

module.exports = {
  logWeight,
  getWeightLogs,
  getWeightStats,
};