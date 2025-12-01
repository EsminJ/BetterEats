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
  heightCm: {
    type: Number,
    required: true, // <-- set to true for ai coach
  },
  weightKg: {
    type: Number,
    required: true, // <-- set to true for ai coach
  },
  goal: {
    type: String,
    enum: ["Lose Weight", "Gain Muscle", "Maintain Weight"], // goal options
    required: true, // <-- set to true for ai coach
  },
  activityLevel: {
    type: String,
    enum: ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"],
    default: "Sedentary"
  },
  gender: {
    type: String,
    enum: ["Male", "Female"],
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  unitPreference: {
    type: String,
    enum: ['imperial', 'metric'],
    default: 'imperial', 
  },
  targetWeight: {
  type: Number,
  default: null
},
targetDate: {
  type: Date,
  default: null
},
});

module.exports = mongoose.model('User', UserSchema);