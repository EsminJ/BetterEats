const WeightLog = require('../models/weightLog.model.js');
const mongoose = require('mongoose'); // Import mongoose for ObjectId

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

// --- New function to get weight history ---
async function getWeightLogs(req, res) {
  try {
    const userId = req.user.id;
    const logs = await WeightLog.find({ userId })
      .sort({ loggedAt: -1 }) // Show most recent first
      .limit(20); // Limit results
    res.json(logs);
  } catch (error) {
    console.error('Error in getWeightLogs:', error);
    res.status(500).json({ error: 'An error occurred while fetching weight logs.' });
  }
}

// --- New function to get aggregated weight stats ---
async function getWeightStats(req, res) {
  try {
    const userId = req.user.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await WeightLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), loggedAt: { $gte: thirtyDaysAgo } } },
      // Group by date - get the *average* weight for that day if multiple entries exist
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$loggedAt" } },
          averageWeight: { $avg: "$weight" } // Use average weight for the day
        }
      },
      { $sort: { _id: 1 } } // Sort by date ascending
    ]);
    
    // We might want to convert all weights to a consistent unit (e.g., lbs) here
    // before sending, depending on how the chart should display it.
    // For now, sending the raw average as logged.
    res.json(stats);
  } catch (error) {
    console.error('Error in getWeightStats:', error);
    res.status(500).json({ error: 'An error occurred while fetching weight stats.' });
  }
}

module.exports = {
  logWeight,
  getWeightLogs,    // Export new function
  getWeightStats,   // Export new function
};