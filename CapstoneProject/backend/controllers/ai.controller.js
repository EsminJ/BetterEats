const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/user.model');
const WeightLog = require('../models/weightLog.model');
const MealLog = require('../models/mealLog.model');
const mongoose = require('mongoose');

// --- Helpers for formatting data ---
const LBS_PER_KG = 2.20462;
const IN_PER_CM = 0.393701;

function convertKgToLbs(kg) {
  const val = Number(kg);
  if (val == null || isNaN(val)) return '0.0';
  return (val * LBS_PER_KG).toFixed(1);
}

function convertCmToFeet(cm) {
  const val = Number(cm);
  if (val == null || isNaN(val)) return '0\'0"';
  const totalInches = val * IN_PER_CM;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

// --- Initialize Gemini ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Using 'gemini-2.5-flash' as it is currently the most stable and fast model for this use case.
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// New function for Natural Language Meal Logging
async function parseNaturalLanguageMeal(req, res) {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Meal description is required.' });

    console.log(`[AI Log] Parsing meal: "${query}"`);

    const prompt = `
      You are a nutritionist API. 
      User Input: "${query}"

      **Instructions:**
      1. Identify food items and quantities.
      2. Estimate nutritional values (Calories, Protein, Fat, Carbs).
      3. Generate a short, friendly confirmation message summarizing what you found (e.g., "I found 2 slices of pizza and a coke. That's about 640 calories.").
      4. Return STRICT JSON. No markdown.

      **Output JSON Structure:**
      {
        "reply": "Your conversational summary here...",
        "foods": [
          {
            "foodName": "Food Item Name",
            "quantity": 1,
            "servingDescription": "1 slice",
            "calories": 100,
            "protein": 5,
            "fat": 2,
            "carbs": 10
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(text);
    res.json(data); // Returns { reply, foods }

  } catch (error) {
    console.error('Error in parseNaturalLanguageMeal:', error);
    res.status(500).json({ error: 'Failed to process meal description.' });
  }
}

// --- Main Controller Function ---
async function getAiSuggestion(req, res) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const userTimeZone = req.query.tz || "America/New_York";

    console.log(`[AI Coach] Generating report for user: ${userId}`);

    // --- 1. Fetch all data in parallel ---
    const [
      user,
      recentWeightLog,
      weightStats,
      nutritionStats
    ] = await Promise.all([
      User.findById(userId).lean(),
      WeightLog.findOne({ userId }).sort({ loggedAt: -1 }).lean(),
      
      // Get 30-day weight stats
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

      // Get 30-day nutrition stats
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

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // --- 2. Format data safely (FORCE NUMBER CASTING) ---
    // We use Number() to ensure strings like "80" don't crash .toFixed()
    
    const userWeight = Number(user.weightKg);
    const userHeight = Number(user.heightCm);

    const startWeightDisplay = !isNaN(userWeight)
      ? `${userWeight.toFixed(1)} kg (${convertKgToLbs(userWeight)} lbs)`
      : "Not set";
      
    const heightDisplay = !isNaN(userHeight)
      ? `${userHeight} cm (${convertCmToFeet(userHeight)})`
      : "Not set";

    const profile = {
      goal: user.goal || "Maintain Weight",
      height: heightDisplay,
      startingWeight: startWeightDisplay
    };

    let currentWeight = "No weight logged yet.";
    
    if (recentWeightLog && recentWeightLog.weight != null) {
      const logWeight = Number(recentWeightLog.weight); // Force number cast
      if (!isNaN(logWeight)) {
        if (recentWeightLog.unit === 'lbs') {
          currentWeight = `${logWeight.toFixed(1)} lbs (${convertKgToLbs(logWeight / LBS_PER_KG)} kg)`;
        } else {
          currentWeight = `${logWeight.toFixed(1)} kg (${convertKgToLbs(logWeight)} lbs)`;
        }
      }
    }

    const hasNutritionData = nutritionStats.length > 0;
    
    console.log(`[AI Coach] Data gathered. Stats count: ${nutritionStats.length}`);

    // --- 3. Build the Prompt ---
    const prompt = `
      You are a friendly and encouraging fitness and nutrition assistant for the "BetterEats" app. 
      Your goal is to give simple, supportive, and actionable advice based on the user's data.
      
      **User Profile:**
      * Fitness Goal: ${profile.goal}
      * Height: ${profile.height}
      * Starting Weight: ${profile.startingWeight}

      **User's Current Progress:**
      * Most Recent Weight: ${currentWeight}
      * 30-Day Weight Trend (Daily Averages in KG): ${JSON.stringify(weightStats)}
      * 30-Day Nutrition Trend (Daily Totals): ${hasNutritionData ? JSON.stringify(nutritionStats) : "No meals logged recently."}

      **Your Task:**
      Write a short, 3-paragraph summary.
      1.  **Greeting & Overview:** Start friendly. Comment on their consistency or weight trend relative to their goal (${profile.goal}).
      2.  **Nutrition Insight:** Analyze the nutrition data (calories/protein). If data is empty, strictly encourage them to log meals to unlock insights.
      3.  **Actionable Tip:** Give 2 simple tips based on the data provided.

      Keep it concise and motivating. Do not use Markdown headers like "##". Use bolding for emphasis.
    `;

    // --- 4. Call Gemini API ---
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("[AI Coach] Gemini response generated successfully.");
    res.json({ suggestion: text });

  } catch (error) {
    console.error('Error in getAiSuggestion:', error);
    // Send the specific error message back to frontend for easier debugging
    res.status(500).json({ error: `AI Error: ${error.message}` });
  }
}

module.exports = {
  getAiSuggestion,
  parseNaturalLanguageMeal,
};