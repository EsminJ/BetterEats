const mongoose = require('mongoose');
const { Schema } = mongoose;

const FoodSchema = new mongoose.Schema({
  fdcId: { type: Number, required: false, unique: false },
  name: { type: String, required: true },
  nutrients: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    carbohydrates: { type: Number, default: 0 },
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
});

module.exports = mongoose.model('Food', FoodSchema);