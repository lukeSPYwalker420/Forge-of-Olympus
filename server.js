const express = require('express');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const app = express();

// MongoDB URI from env variable
const dbURI = process.env.USER_DB_URI;
if (!dbURI) {
  console.error('MongoDB URI is not defined!');
  process.exit(1); 
}

// Database Connection
mongoose.connect(dbURI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Enable CORS for specific origin (update this with your frontend URL)
app.use(cors({
  origin: 'https://forge-of-olympus.onrender.com',  // Update this if needed
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Body parser middleware for JSON data
app.use(express.json());

app.use(express.static(path.join(__dirname)));  // Serve from root folder

// MongoDB Schema and Model
const userSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true },
  email: { type: String, unique: true, sparse: true }, // Sparse allows null values
  workoutPreferences: { type: String },
  dietPreferences: { type: String },
  activityLevel: { type: String },
  allergies: { type: String },
  medicalConditions: { type: String },
  mealFrequency: { type: String },
  cookFrequency: { type: String },
  groceryBudget: { type: String },
  step: { type: String },
  measurementPreference: { type: String },
});

// Add indexing for scalability
userSchema.index({ sessionId: 1 });  // Index for sessionId field
userSchema.index({ email: 1 });  // Optional: Index for email field
userSchema.index({ activityLevel: 1 });  // Index for activityLevel field
userSchema.index({ workoutPreferences: 1 });  // Index for workoutPreferences field
userSchema.index({ mealFrequency: 1 });  // Index for mealFrequency field
userSchema.index({ cookFrequency: 1 });  // Index for cookFrequency field
userSchema.index({ step: 1 });  // Index for step field

const User = mongoose.model('User', userSchema);

// MongoDB Models for exercises and meals
const exerciseSchema = new mongoose.Schema({
  name: String,                 // e.g., "Bench Press"
  muscle_group: String,         // e.g., "Chest"
  equipment: String,            // e.g., "Barbell"
  difficulty: String,           // e.g., "Intermediate"
  goal: [String],               // e.g., ["muscle_gain", "strength"]
  type: String,                 // e.g., "Strength"
  sets_reps: String             // e.g., "3x12"
});

const mealSchema = new mongoose.Schema({
  name: String,
  ingredients: [String],
  calories: Number,
  macronutrients: {
    protein: Number,
    carbs: Number,
    fats: Number
  },
  restrictions: [String],
  mealCategory: { 
    type: String, 
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], // Define valid categories
    required: true // Ensure that every meal has a category
  },
  type: String, // e.g., "Lunch"
});

const Exercise = mongoose.model('Exercise', exerciseSchema);
const Meal = mongoose.model('Meal', mealSchema);

// Helper Functions for Plan Generation
function getExercises(userData) {
  const query = {
    goal: userData.goal,
    difficulty: { $lte: userData.activity_level }, // Filter by activity level
    equipment: userData.equipment_preference,
    environment: userData.workout_environment, // Filter by workout environment
    type: userData.exercise_type_preference,   // Filter by type of exercise preference
  };

  // Avoid exercises that the user needs to skip due to injury or other reasons
  if (userData.injury_avoidances && userData.injury_avoidances.length > 0) {
    query.name = { $nin: userData.injury_avoidances }; // Exclude exercises with specific names
  }

  // If the user has a workout frequency preference, adjust the query to match
  if (userData.workout_frequency_preference) {
    query.frequency = userData.workout_frequency_preference;
  }

  // New: If the user prefers beginner or advanced exercises, filter based on complexity
  if (userData.complexity_preference) {
    query.complexity = userData.complexity_preference; // E.g., "Beginner", "Advanced"
  }

  return Exercise.find(query);
}

function getMeals(userData) {
  // Create a query object for meal filtering
  let query = {
    calories: { $lte: userData.daily_calories },  // Max calorie limit
    restrictions: { $in: userData.dietary_restrictions },  // Dietary restrictions
    mealCategory: { $in: userData.mealTimes }  // Meal categories (e.g., Breakfast, Lunch, etc.)
  };

  // Optional: Add budget filter (if user has a grocery budget set)
  if (userData.groceryBudget) {
    query.price = { $lte: userData.groceryBudget };  // Assuming you have a price field in your meals collection
  }

  // Optional: Add macronutrient goals (protein, carbs, fats) if available
  if (userData.macronutrientGoals) {
    query['macronutrients.protein'] = { $gte: userData.macronutrientGoals.protein };
    query['macronutrients.carbs'] = { $lte: userData.macronutrientGoals.carbs };
    query['macronutrients.fats'] = { $lte: userData.macronutrientGoals.fats };
  }

  return Meal.find(query);
}

// Helper function for TDEE calculation
function calculateTDEE(weight, height, age, activityLevel, bodyFatPercentage = null) {
  let BMR;

  if (bodyFatPercentage) {
    // Katch-McArdle Formula (for lean body mass)
    const leanBodyMass = weight * (1 - bodyFatPercentage / 100);
    BMR = 370 + (21.6 * leanBodyMass);
  } else {
    // Harris-Benedict Formula (for standard BMR)
    BMR = 10 * weight + 6.25 * height - 5 * age + 5; // For men
  }

  // Activity level multipliers (you can adjust these values)
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    heavy: 1.725,
    veryHeavy: 1.9,
  };

  // Calculate TDEE (Total Daily Energy Expenditure)
  return BMR * (activityMultipliers[activityLevel] || 1.2); // Default to sedentary if not found
}

async function generatePlan(userData) {
  // Fetch exercises based on user data with the new conditions
  const exercises = await getExercises(userData); 
  const meals = await getMeals(userData);

  // Group meals by their mealCategory
  const mealPlan = {
    breakfast: meals.filter(meal => meal.mealCategory === 'Breakfast'),
    lunch: meals.filter(meal => meal.mealCategory === 'Lunch'),
    dinner: meals.filter(meal => meal.mealCategory === 'Dinner'),
    snacks: meals.filter(meal => meal.mealCategory === 'Snack')
  };

  // Generate exercise plan, considering the available days and user preferences
  const exercisePlan = buildExerciseSchedule(exercises, userData.available_days);
  
  return { exercise_plan: exercisePlan, diet_plan: mealPlan };
}

// Routes for processing user data
app.post('/api/user/process', async (req, res) => {
  const { step, data } = req.body;

  if (!step || !data || !data.sessionId) {
    return res.status(400).json({ error: 'Missing step, data, or sessionId' });
  }

  try {
    let user = await User.findOne({ sessionId: data.sessionId });

    if (!user) {
      user = new User({ sessionId: data.sessionId, ...data });
    } else {
      user = Object.assign(user, data);
    }

    user.step = step; // Save the current step
    await user.save();

    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error during data save:', error);
    res.status(500).json({ error: 'Error saving data' });
  }
});

// Profile completion route
app.post('/api/user/complete-profile', async (req, res) => {
  const { sessionId, email, profileData } = req.body;

  // Check if sessionId or email is missing
  if (!sessionId || !email) {
    return res.status(400).json({ error: 'Missing sessionId or email' });
  }

  // Email validation
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const user = await User.findOne({ sessionId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.email = email; // Update the email
    Object.assign(user, profileData); // Merge profile data
    await user.save();

    res.json({ success: true, message: 'Profile completed successfully' });
  } catch (error) {
    console.error('Error during profile completion:', error);
    res.status(500).json({ error: 'Error completing profile' });
  }
});

// Plan generation route
app.post('/api/user/generate-plan', async (req, res) => {
  const { userData } = req.body;

  if (!userData) {
    return res.status(400).json({ error: 'Missing user data' });
  }

  try {
    const { exercise_plan, diet_plan } = await generatePlan(userData);
    res.json({ exercise_plan, diet_plan });
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({ error: 'Error generating plan' });
  }
});

// Serve the frontend (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Set the port variable
const port = process.env.PORT || 5000;

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});