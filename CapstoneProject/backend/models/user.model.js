const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Make username unique as well
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // --- New Fields ---
  heightCm: {
    type: Number,
    required: false, // Make optional for now
  },
  weightKg: {
    type: Number,
    required: false, // Make optional for now
  },
  goal: {
    type: String,
    enum: ["Lose Weight", "Gain Muscle", "Maintain Weight"], // Use the same options as frontend
    required: false, // Make optional for now
  },
  unitPreference: {
    type: String,
    enum: ['imperial', 'metric'],
    default: 'imperial', // Default preference
  },
});

module.exports = mongoose.model('User', UserSchema);