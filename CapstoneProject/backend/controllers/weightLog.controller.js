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

async function getWeightStats(req, res) {
  try {
    const userId = req.user.id;
    const { startDate, endDate, range } = req.query; 

    // Use provided dates, or default to 30 days ago if missing
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    // Set end date to end of day to ensure we catch logs on that day
    end.setHours(23, 59, 59, 999);

    let groupByFormat = "%Y-%m-%d"; // Default daily
    if (range === '1y') groupByFormat = "%Y-%m"; // Monthly for year view

    const stats = await WeightLog.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId), 
          loggedAt: { $gte: start, $lte: end } // Explicit window
        } 
      },
      {
        $project: {
          loggedAt: 1, 
          weightInKg: {
            $cond: {
              if: { $eq: ["$unit", "lbs"] },
              then: { $multiply: ["$weight", 0.45359237] }, 
              else: "$weight"
            }
          }
        }
      },
      { $group: {
          _id: { $dateToString: { format: groupByFormat, date: "$loggedAt" } },
          averageWeightKg: { $avg: "$weightInKg" } 
        }
      },
      { $sort: { _id: 1 } } 
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