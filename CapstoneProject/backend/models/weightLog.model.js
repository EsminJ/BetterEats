const mongoose = require('mongoose');
const { Schema } = mongoose;

const WeightLogSchema = new mongoose.Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  weight: {
    type: Number, // Store weight numerically
    required: true,
  },
  unit: {
    type: String,
    enum: ['lbs', 'kg'], // Allow storing the unit used at entry
    required: true,
    default: 'lbs', // Default to lbs
  },
  loggedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('WeightLog', WeightLogSchema);