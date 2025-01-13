const express = require('express');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv'); 
const cors = require('cors');

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
    process.exit(1);  // Exit if connection fails
  });

// Enable CORS for specific origin (update this with your frontend URL)
app.use(cors({
  origin: 'https://forge-of-olympus.onrender.com', // Replace with your actual frontend domain
  methods: ['GET', 'POST'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type'], // Allowed headers for requests
}));

// Body parser middleware for JSON data
app.use(express.json());

// MongoDB Schema and Model
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String, required: true, unique: true },
  age: { type: Number },
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

const User = mongoose.model('User', userSchema);

// Handle step data processing and storing in the database
app.post('/api/user/process', async (req, res) => {
  const { step, data } = req.body;

  // Check if the required step and data are provided
  if (!step || !data) {
    return res.status(400).json({ error: 'Missing step or data' });
  }

  try {
    let user = await User.findOne({ email: data.email });

    if (!user) {
      user = new User({ id: uuidv4(), ...data });
    } else {
      user = Object.assign(user, data);
    }

    user.step = step;

    await user.save();

    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error during data save:', error);
    res.status(500).json({ error: 'Error saving data' });
  }
});

// Set the port variable
const port = process.env.PORT || 5000;

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});