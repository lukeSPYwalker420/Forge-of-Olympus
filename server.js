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
  sessionId: { type: String, index:true},
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

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);
const Meal = mongoose.model('Meal', mealSchema);

// Function to search for plans based on user data
async function searchPlans(userData) {
  // Query for exercises based on user preferences
  let exerciseQuery = {};
  if (userData.workoutPreferences) {
    exerciseQuery.goal = { $in: userData.workoutPreferences.split(',') }; // Match workout goals (e.g., "muscle_gain")
  }
  if (userData.activityLevel) {
    exerciseQuery.difficulty = userData.activityLevel; // Match difficulty (e.g., "Intermediate")
  }

  const exercises = await Exercise.find(exerciseQuery);

  // Query for meals based on user preferences
  let mealQuery = {
    mealCategory: { $in: userData.mealTimes || ['Breakfast', 'Lunch', 'Dinner', 'Snack'] }, // Default to all categories if none specified
  };

  // Optional: Filter by dietary restrictions and budget if available
  if (userData.dietaryRestrictions) {
    mealQuery.restrictions = { $in: userData.dietaryRestrictions.split(',') }; // Match dietary restrictions (e.g., "gluten-free")
  }

  if (userData.groceryBudget) {
    mealQuery.calories = { $lte: userData.groceryBudget }; // Assume calorie budget is for simplicity
  }

  const meals = await Meal.find(mealQuery);

  return { exercises, meals };
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

// New route for finding personalized plans
app.post('/api/user/find-plans', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    // Fetch user data based on sessionId
    const user = await User.findOne({ sessionId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Search for matching exercise and meal plans
    const { exercises, meals } = await searchPlans(user);

    res.json({ exercises, meals });
  } catch (error) {
    console.error('Error finding plans:', error);
    res.status(500).json({ error: 'Error finding plans' });
  }
});

// Set the port variable
const port = process.env.PORT || 5000;

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
