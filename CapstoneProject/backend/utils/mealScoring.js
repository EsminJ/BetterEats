// Utility to score a single meal against a user's daily targets.
// Returns an object with the final score, grade, and sub-score breakdown, or null if the meal cannot be scored.

const GOAL_MAP = {
  LOSE_WEIGHT: 'LOSE_WEIGHT',
  'LOSE WEIGHT': 'LOSE_WEIGHT',
  'LOSEWEIGHT': 'LOSE_WEIGHT',
  GAIN_MUSCLE: 'GAIN_MUSCLE',
  'GAIN MUSCLE': 'GAIN_MUSCLE',
  'GAINMUSCLE': 'GAIN_MUSCLE',
  MAINTAIN: 'MAINTAIN',
  'MAINTAIN WEIGHT': 'MAINTAIN',
  'MAINTAIN_WEIGHT': 'MAINTAIN',
};

const goalWeights = {
  LOSE_WEIGHT: { cal: 0.5, pro: 0.35, mac: 0.15 },
  MAINTAIN: { cal: 0.4, pro: 0.3, mac: 0.3 },
  GAIN_MUSCLE: { cal: 0.3, pro: 0.5, mac: 0.2 },
};

const macroRanges = {
  LOSE_WEIGHT: {
    protein: [0.3, 0.4],
    fat: [0.25, 0.35],
    carbs: [0.25, 0.4],
  },
  MAINTAIN: {
    protein: [0.2, 0.3],
    fat: [0.25, 0.35],
    carbs: [0.4, 0.55],
  },
  GAIN_MUSCLE: {
    protein: [0.25, 0.35],
    fat: [0.2, 0.3],
    carbs: [0.4, 0.55],
  },
};

const proteinDensityTargets = {
  LOSE_WEIGHT: 0.3,
  MAINTAIN: 0.2,
  GAIN_MUSCLE: 0.3,
};

const mealShares = {
  BREAKFAST: 0.25,
  LUNCH: 0.3,
  DINNER: 0.3,
  SNACK: 0.15,
};

const gradeForScore = (score) => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Okay';
  return 'Poor';
};

const normalizeGoal = (goal) => {
  if (!goal) return 'MAINTAIN';
  const key = goal.toString().trim().toUpperCase().replace(/\s+/g, ' ');
  return GOAL_MAP[key] || GOAL_MAP[key.replace(/\s/g, '')] || 'MAINTAIN';
};

const normalizeMealType = (mealType) => {
  if (!mealType) return null;
  return mealType.toString().trim().toUpperCase();
};

const macroPenalty = (pct, low, high) => {
  if (pct >= low && pct <= high) return 0;
  if (pct < low) return (low - pct) / (low || 1);
  return (pct - high) / (1 - high || 1);
};

const buildExplanations = (scores, pctProtein, pctCarbs, pctFat, target) => {
  const messages = [];

  if (scores.calorie_alignment_score >= 85) {
    messages.push('Good calorie size for your daily goal.');
  } else if (scores.calorie_alignment_score >= 50) {
    messages.push('Calorie portion is a bit off your ideal share.');
  } else {
    messages.push('Calories are far from your ideal share for this meal.');
  }

  if (scores.protein_alignment_score >= 85) {
    messages.push('Protein amount and density look strong.');
  } else if (scores.protein_alignment_score >= 50) {
    messages.push('Protein could be higher to better support your goal.');
  } else {
    messages.push('Very low protein contribution for this meal.');
  }

  const [protRange, fatRange, carbRange] = [
    target.protein,
    target.fat,
    target.carbs,
  ];

  const macroNotes = [];
  if (pctProtein < protRange[0]) macroNotes.push('protein is low');
  if (pctProtein > protRange[1]) macroNotes.push('protein is high');
  if (pctFat < fatRange[0]) macroNotes.push('fat is low');
  if (pctFat > fatRange[1]) macroNotes.push('fat is high');
  if (pctCarbs < carbRange[0]) macroNotes.push('carbs are low');
  if (pctCarbs > carbRange[1]) macroNotes.push('carbs are high');

  if (macroNotes.length === 0) {
    messages.push('Macros are balanced for your goal.');
  } else {
    messages.push(`Macro balance needs attention: ${macroNotes.join(', ')}.`);
  }

  return messages;
};

function calculateMealEffectivenessScore({
  goal,
  dailyCalorieTarget,
  dailyProteinTarget,
  dailyFatTarget,
  dailyCarbTarget,
  mealCalories,
  mealProteinG,
  mealFatG,
  mealCarbsG,
  mealType,
}) {
  const normalizedGoal = normalizeGoal(goal);
  const weights = goalWeights[normalizedGoal] || goalWeights.MAINTAIN;
  const ranges = macroRanges[normalizedGoal] || macroRanges.MAINTAIN;
  const targetDensity = proteinDensityTargets[normalizedGoal] || proteinDensityTargets.MAINTAIN;

  const calories = Number(mealCalories) || 0;
  if (calories <= 0) return null;

  const proteinCal = (Number(mealProteinG) || 0) * 4;
  const carbCal = (Number(mealCarbsG) || 0) * 4;
  const fatCal = (Number(mealFatG) || 0) * 9;

  const pctProtein = calories > 0 ? proteinCal / calories : 0;
  const pctCarbs = calories > 0 ? carbCal / calories : 0;
  const pctFat = calories > 0 ? fatCal / calories : 0;

  const normalizedMealType = normalizeMealType(mealType);
  const idealShare = mealShares[normalizedMealType] || 0.3;
  const idealMealCal = (Number(dailyCalorieTarget) || 0) * idealShare;
  const ratioDiff = idealMealCal > 0 ? Math.abs(calories - idealMealCal) / idealMealCal : 1;
  const calorie_alignment_score = (1 - Math.min(ratioDiff, 1)) * 100;

  const proteinFraction = (Number(mealProteinG) || 0) / (Number(dailyProteinTarget) || 1);
  const protein_fraction_capped = Math.min(proteinFraction, 0.5);
  const protein_amount_score = Math.min(protein_fraction_capped / 0.25, 1) * 100;

  const actual_density = pctProtein;
  let protein_density_score;
  if (actual_density >= targetDensity) {
    protein_density_score = 100;
  } else {
    const density_diff = (targetDensity - actual_density) / targetDensity;
    protein_density_score = (1 - Math.min(density_diff, 1)) * 100;
  }
  const protein_alignment_score = 0.4 * protein_amount_score + 0.6 * protein_density_score;

  const pen_prot = macroPenalty(pctProtein, ranges.protein[0], ranges.protein[1]);
  const pen_fat = macroPenalty(pctFat, ranges.fat[0], ranges.fat[1]);
  const pen_carb = macroPenalty(pctCarbs, ranges.carbs[0], ranges.carbs[1]);
  const avg_penalty = (pen_prot + pen_fat + pen_carb) / 3;
  const macro_balance_score = (1 - Math.min(avg_penalty, 1)) * 100;

  const raw_score =
    weights.cal * calorie_alignment_score +
    weights.pro * protein_alignment_score +
    weights.mac * macro_balance_score;

  const meal_effectiveness_score = Math.round(raw_score);
  const score_grade = gradeForScore(meal_effectiveness_score);

  const explanation = buildExplanations(
    { calorie_alignment_score, protein_alignment_score, macro_balance_score },
    pctProtein,
    pctCarbs,
    pctFat,
    {
      protein: ranges.protein,
      fat: ranges.fat,
      carbs: ranges.carbs,
    }
  );

  return {
    meal_effectiveness_score,
    score_grade,
    score_breakdown: {
      calorie_alignment_score,
      protein_alignment_score,
      macro_balance_score,
    },
    explanation,
    meta: {
      pct_protein: pctProtein,
      pct_carbs: pctCarbs,
      pct_fat: pctFat,
      meal_type: normalizedMealType || 'UNSPECIFIED',
      goal: normalizedGoal,
    },
  };
}

module.exports = {
  calculateMealEffectivenessScore,
};
