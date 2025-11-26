const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import Models
const User = require('./models/user.model');
const MealLog = require('./models/mealLog.model');
const WeightLog = require('./models/weightLog.model');
const Food = require('./models/food.model');

// Configuration
const TARGET_USERNAME = 'cap125'; // <--- CHANGE THIS to your username
const DAYS_OF_HISTORY = 365;      // Generate 1 year of data

// Helper: Get Random Number between min/max
const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB...');

    // 1. Find the user
    const user = await User.findOne({ username: TARGET_USERNAME });
    if (!user) {
      console.error(`❌ User "${TARGET_USERNAME}" not found! Please check the username.`);
      process.exit(1);
    }
    console.log(`👤 Found User: ${user.username} (${user._id})`);

    // 2. Find a generic food to link to (or create one placeholder)
    let food = await Food.findOne();
    if (!food) {
      food = await new Food({ name: "Test Food", servings: [{ description: "1 unit", nutrients: { calories: 500 } }] }).save();
    }

    console.log(`Beginning data generation for the past ${DAYS_OF_HISTORY} days...`);

    const mealLogs = [];
    const weightLogs = [];
    let currentWeight = 190; // Starting weight (lbs)

    for (let i = 0; i < DAYS_OF_HISTORY; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i); // Go back 'i' days

      // --- A. Generate Weight (simulate a trend) ---
      // Every 3 days, log a weight
      if (i % 3 === 0) {
        // Random fluctuation but generally trending down
        const fluctuation = (Math.random() - 0.6); // Slight downward bias
        currentWeight += fluctuation;
        
        weightLogs.push({
          userId: user._id,
          weight: parseFloat(currentWeight.toFixed(1)),
          unit: 'lbs',
          loggedAt: new Date(date)
        });
      }

      // --- B. Generate Meals (3 meals a day) ---
      const meals = ['Breakfast', 'Lunch', 'Dinner'];
      meals.forEach(type => {
        // Randomize nutrients slightly to make the chart look real
        const cals = random(400, 900);
        const protein = random(20, 50);
        const fat = random(10, 30);
        const carbs = random(40, 100);

        mealLogs.push({
          userId: user._id,
          foodId: food._id,
          mealType: type,
          quantity: 1,
          loggedAt: new Date(date.setHours(random(8, 20))), // Random time between 8am-8pm
          servingDescription: "1 test portion",
          caloriesPerServing: cals,
          proteinPerServing: protein,
          fatPerServing: fat,
          carbohydratesPerServing: carbs
        });
      });
    }

    // 3. Bulk Insert
    if (mealLogs.length > 0) {
      await MealLog.insertMany(mealLogs);
      console.log(`✅ Inserted ${mealLogs.length} meal logs.`);
    }
    
    if (weightLogs.length > 0) {
      await WeightLog.insertMany(weightLogs);
      console.log(`✅ Inserted ${weightLogs.length} weight logs.`);
    }

    console.log('🎉 Seeding Complete!');
    process.exit();

  } catch (err) {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  }
};

seedData();