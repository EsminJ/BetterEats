const mongoose = require('mongoose');
const { Schema } = mongoose;

const MealLogSchema = new mongoose.Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  foodId: {
    type: Schema.Types.ObjectId,
    ref: 'Food',
    required: true,
  },
  mealType: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  loggedAt: {
    type: Date,
    default: Date.now,
  },
  // --- NEW FIELDS ---
  // Store the details of the serving at the time of logging
  servingDescription: {
    type: String,
    required: true,
    default: '1 serving',
  },
  caloriesPerServing: {
    type: Number,
    required: true,
    default: 0,
  },
  // --- ADD THESE NEW FIELDS ---
  proteinPerServing: {
    type: Number,
    required: true,
    default: 0,
  },
  fatPerServing: {
    type: Number,
    required: true,
    default: 0,
  },
  carbohydratesPerServing: {
    type: Number,
    required: true,
    default: 0,
  }
});

module.exports = mongoose.model('MealLog', MealLogSchema);