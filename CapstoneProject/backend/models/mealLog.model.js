const mongoose = require('mongoose');
const { Schema } = mongoose;

const MealLogSchema = new mongoose.Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // This creates a reference to the User model
    required: true,
  },
  foodId: {
    type: Schema.Types.ObjectId,
    ref: 'Food', // This creates a reference to the Food model
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
});

module.exports = mongoose.model('MealLog', MealLogSchema);
