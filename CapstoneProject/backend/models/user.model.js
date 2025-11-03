const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // unique val username
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
    required: false, // not req
  },
  weightKg: {
    type: Number,
    required: false, // not req
  },
  goal: {
    type: String,
    enum: ["Lose Weight", "Gain Muscle", "Maintain Weight"], // goal options
    required: false, // not req
  },
  unitPreference: {
    type: String,
    enum: ['imperial', 'metric'],
    default: 'imperial', 
  },
});

module.exports = mongoose.model('User', UserSchema);