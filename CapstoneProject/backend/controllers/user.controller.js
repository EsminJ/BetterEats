const User = require('../models/user.model');

async function getUserProfile(req, res) {
  try {
    // Fetch user but exclude the password hash
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
}

async function updateUserGoal(req, res) {
  try {
    const { goal, unitPreference, activityLevel, age, gender } = req.body; // moved unit preference here
    const updateData = {};

    if (goal) {
      const validGoals = ["Lose Weight", "Gain Muscle", "Maintain Weight"];
      if (validGoals.includes(goal)) updateData.goal = goal;
    }

    if (activityLevel) {
      const validActivities = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"];
      if (validActivities.includes(activityLevel)) updateData.activityLevel = activityLevel;
    }

    if (unitPreference) {
      if (['imperial', 'metric'].includes(unitPreference)) {
        updateData.unitPreference = unitPreference;
      }
    }

    if (gender && ['Male', 'Female'].includes(gender)) {
      updateData.gender = gender;
    }

    if (age && !isNaN(age)) {
      updateData.age = Number(age);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      updateData, 
      { new: true } 
    ).select('-passwordHash');

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update profile' });
  }
}

module.exports = {
  getUserProfile,
  updateUserGoal
};