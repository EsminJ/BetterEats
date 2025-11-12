const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/user.model');
const WeightLog = require('../models/weightLog.model');
const MealLog = require('../models/mealLog.model');
const mongoose = require('mongoose');

// --- Helpers for formatting data ---
const LBS_PER_KG = 2.20462;
const IN_PER_CM = 0.393701;

function convertKgToLbs(kg) {
  return (kg * LBS_PER_KG).toFixed(1);
}

function convertCmToFeet(cm) {
  const totalInches = cm * IN_PER_CM;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

// --- Initialize Gemini ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });

// --- Main Controller Function ---
async function getAiSuggestion(req, res) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const userTimeZone = req.query.tz || "America/New_York";

    // --- 1. Fetch all data in parallel ---
    const [
      user,
      recentWeightLog,
      weightStats,
      nutritionStats
    ] = await Promise.all([
      User.findById(userId).lean(),
      WeightLog.findOne({ userId }).sort({ loggedAt: -1 }).lean(),
      
      // Get 30-day weight stats (logic from weightLog.controller.js)
      WeightLog.aggregate([
        { $match: { userId, loggedAt: { $gte: thirtyDaysAgo } } },
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
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$loggedAt" } },
            averageWeightKg: { $avg: "$weightInKg" } 
          }
        },
        { $sort: { _id: 1 } } 
      ]),

      // Get 30-day nutrition stats (logic from mealLog.controller.js)
      MealLog.aggregate([
        { $match: { userId, loggedAt: { $gte: thirtyDaysAgo } } },
        { $group: {
            _id: { 
              $dateToString: { 
                format: "%Y-%m-%d", 
                date: "$loggedAt",
                timezone: userTimeZone
              } 
            },
            totalCalories: { $sum: { $multiply: [ "$caloriesPerServing", "$quantity" ] } },
            totalProtein: { $sum: { $multiply: [ "$proteinPerServing", "$quantity" ] } },
            totalFat: { $sum: { $multiply: [ "$fatPerServing", "$quantity" ] } },
            totalCarbs: { $sum: { $multiply: [ "$carbohydratesPerServing", "$quantity" ] } }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // --- 2. Handle "no data" cases ---
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (nutritionStats.length === 0) {
      return res.status(400).json({ error: 'Not enough data. Please log some meals to get AI advice.' });
    }
    
    // --- 3. Format data for the prompt ---
    const profile = {
      goal: user.goal,
      height: `${user.heightCm} cm (${convertCmToFeet(user.heightCm)})`,
      startingWeight: `${user.weightKg.toFixed(1)} kg (${convertKgToLbs(user.weightKg)} lbs)`
    };

    let currentWeight = "No weight logged yet.";
    if (recentWeightLog) {
      if (recentWeightLog.unit === 'lbs') {
        currentWeight = `${recentWeightLog.weight.toFixed(1)} lbs (${convertKgToLbs(recentWeightLog.weight / LBS_PER_KG)} kg)`;
      } else {
        currentWeight = `${recentWeightLog.weight.toFixed(1)} kg (${convertKgToLbs(recentWeightLog.weight)} lbs)`;
      }
    }

    // --- 4. Build the Prompt ---
    const prompt = `
      You are a friendly and encouraging fitness and nutrition assistant for the "BetterEats" app. 
      Your goal is to give simple, supportive, and actionable advice based on the user's data.
      Do not be overly strict or medical.
      
      Here is the user's data:

      **User Profile:**
      * Fitness Goal: ${profile.goal}
      * Height: ${profile.height}
      * Starting Weight (at registration): ${profile.startingWeight}

      **User's Current Progress:**
      * Most Recent Weight: ${currentWeight}
      * 30-Day Weight Trend (Daily Averages in KG): ${JSON.stringify(weightStats)}
      * 30-Day Nutrition Trend (Daily Totals): ${JSON.stringify(nutritionStats)}

      **Your Task:**
      Please provide a short (3-4 paragraphs) summary for the user.
      1.  Start with a friendly greeting.
      2.  Briefly comment on their weight trend in relation to their goal of "${profile.goal}".
      3.  Analyze their 30-day nutrition averages.
      4.  Provide 2-3 simple, actionable tips based on this data.

      **Important Guidelines for Advice:**
      * **If Goal is "Gain Muscle":** Check if their average daily protein is near the 1g per 1lb of body weight rule (or 2.2g per kg). Advise them to increase protein if they are far below this.
      * **If Goal is "Lose Weight":** Comment on their average daily calories. Are they in a consistent range? Suggest simple swaps to reduce calories if their weight trend is flat or increasing.
      * **If Goal is "Maintain Weight":** Comment on their consistency. Are their calories and weight stable? Praise this.

      Keep the language simple. End with an encouraging closing.
    `;

    // --- 5. Call Gemini API ---
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ suggestion: text });

  } catch (error) {
    console.error('Error in getAiSuggestion:', error);
    res.status(500).json({ error: 'An error occurred while generating AI advice.' });
  }
}

module.exports = {
  getAiSuggestion,
};