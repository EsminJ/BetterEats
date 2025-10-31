const mongoose = require('mongoose');
const { Schema } = mongoose;

const NutrientSchema = new Schema({
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  carbohydrates: { type: Number, default: 0 },
}, { _id: false });

const ServingSchema = new Schema({
  description: { type: String, required: true }, // e.g., "100g", "1 burger", "1 cup"
  nutrients: NutrientSchema,
}, { _id: false });

const FoodSchema = new mongoose.Schema({
  fdcId: { type: Number, required: false },
  name: { type: String, required: true },
  servings: [ServingSchema], // An array of possible serving sizes
  isCustom: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
});

module.exports = mongoose.model('Food', FoodSchema);