const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const validator = require('validator');


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

// CORS setup (before route handlers)
app.use(cors({
  origin: ['https://forge-of-olympus.onrender.com', 'null'],  // Allow only the specified origins
  methods: ['GET', 'POST',],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

// Body parser middleware for JSON data
app.use(express.json());

// Log the Origin header to debug
app.use((req, res, next) => {
  console.log('Origin:', req.get('Origin'));  // Log the Origin header to debug
  next();
});

// API Route for merging user data (must be defined after CORS)
app.post('/api/user/merge', async (req, res) => {
  const { email, newData } = req.body;

  // Check if email and newData are provided
  if (!email || !newData) {
    return res.status(400).json({ error: 'Missing email or new data' });
  }

  try {
    // Find the user by email
    let user = await User.findOne({ email });

    // If user does not exist, create a new one
    if (!user) {
      user = new User({ email, ...newData });
    } else {
      // Merge the new data into the existing user object
      user = Object.assign(user, newData);
    }

    // Save the updated or newly created user
    await user.save();

    res.json({ success: true, message: 'User data merged successfully', user });
  } catch (error) {
    console.error('Error during data merge:', error);
    res.status(500).json({ error: 'Error merging user data' });
  }
});

// Catch-all route to serve index.html for any request that doesn't match an API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'quiz.html'));
});

// User Schema with Follow-up Answers as a Map for Dynamic Fields
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  workoutPreferences: { type: String },
  dietPreferences: { type: String },
  activityLevel: { type: String },
  allergies: { type: [String] }, // Multiple allergies
  medicalConditions: { type: [String] }, // Multiple conditions
  mealFrequency: { type: String },
  cookFrequency: { type: String },
  groceryBudget: { type: String },
  step: { type: String },
  measurementPreference: { type: String },
  followUpAnswers: { type: Map, of: String } // For storing dynamic answers
});

// Compile the User schema into a model
const User = mongoose.model('User', userSchema);


// Exercise Schema with Array for Goals
const exerciseSchema = new mongoose.Schema({
  name: String,
  muscle_group: String,
  equipment: String,
  difficulty: String,
  goal: { type: [String] }, // Multiple goals
  type: String,
  sets_reps: String
});

// Meal Schema with Optional Nutrition Fields
const mealSchema = new mongoose.Schema({
  name: String,
  ingredients: { type: [String], required: true },
  calories: Number,
  macronutrients: {
    protein: Number,
    carbs: Number,
    fats: Number,
    fiber: { type: Number },
    sugar: { type: Number }
  },
  restrictions: { type: [String] },
  mealCategory: { 
    type: String, 
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], 
    required: true 
  },
  type: String
});

const Exercise = mongoose.model('Exercise', exerciseSchema);
const Meal = mongoose.model('Meal', mealSchema);

// Helper Functions for Plan Generation
const fs = require('fs');

// Read exercise plans from exercise.json
async function getExercises(userData) {
  try {
    // Read and parse the exercise.json file
    const filePath = path.join(__dirname, 'exercise.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const exercisePlans = JSON.parse(data);

    // Initialize an empty array to store the tags based on user data
    let tags = [];

    // **Goal Handling**
    if (userData.goal) {
      tags.push(userData.goal);  // e.g., "Muscle Gain"
    }

    // **Workout Frequency**
    if (userData.days_per_week) {
      tags.push(userData.days_per_week);  // e.g., "2 Days a Week"
    }

    // **Exercise Type Preference (Strength, Cardio, etc.)**
    if (userData.exercise_type_preference) {
      tags.push(userData.exercise_type_preference);  // e.g., "Weight Training"
    }

    // **Injury Handling**
    if (!userData.injury_avoidances || userData.injury_avoidances.length === 0) {
      tags.push("No Injuries");
    } else {
      userData.injury_avoidances.forEach(injury => {
        tags.push(injury);  // e.g., "Knee Injury"
      });
    }

    // **Fitness Level Handling**
    if (userData.fitness_level) {
      tags.push(userData.fitness_level);  // e.g., "Beginner"
    }

    // **Exercise Environment (Gym/Home Gym)**
    if (userData.exercise_environment) {
      tags.push(userData.exercise_environment);  // e.g., "Gym/Home Gym"
    }

    // **Focus Type**
    if (userData.focus_type) {
      tags.push(userData.focus_type);  // e.g., "Strength Focus"
    }

    // **Dietary Restrictions** (Optional)
    if (userData.dietary_restrictions && userData.dietary_restrictions !== "None") {
      tags.push(userData.dietary_restrictions);  // e.g., "Vegan"
    }

    // **Filter the exercise plans based on the tags**
    const availablePlans = exercisePlans.filter(plan => {
      // Check if all user tags are present in the plan's tags
      return tags.every(tag => plan.tags.includes(tag));
    });

    // If no plans match, return null
    if (availablePlans.length === 0) {
      return null; // No matching plans found
    }

    // Return the first matching plan (or more depending on your needs)
    return availablePlans[0];

  } catch (error) {
    console.error('Error reading or parsing exercise.json:', error);
    throw new Error('Error fetching exercise plans');
  }
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

// Serve static files after defining API routes
app.use(express.static(path.join(__dirname, 'public')));  // Adjust 'public' folder name as needed

// Catch-all route for serving the index.html page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quiz.html'));  // Adjust the 'public' folder path as needed
});


app.post('/api/user/process', async (req, res) => {
  const { step, data } = req.body;

  if (!step || !data || !data.email) {
    return res.status(400).json({ error: 'Missing step, data, or email' });
  }

  try {
    let user = await User.findOne({ email: data.email });

    if (!user) {
      user = new User({ email: data.email, ...data });
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
  const { email, profileData } = req.body;

  // Check if email is missing
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }

  // Email validation
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.email = email; // Ensure email is set
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
  const { email, userData } = req.body;

  if (!email || !userData) {
    return res.status(400).json({ error: 'Missing email or user data' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { exercise_plan, diet_plan } = await generatePlan(userData);
    res.json({ exercise_plan, diet_plan });
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({ error: 'Error generating plan' });
  }
});

// Serve the frontend (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'quiz.html'));
});

// Set the port variable
const port = process.env.PORT || 5000;

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });