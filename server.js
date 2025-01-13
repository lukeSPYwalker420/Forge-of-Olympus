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
  origin: 'https://forge-of-olympus.onrender.com', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Body parser middleware for JSON data
app.use(express.json());

// Serve static files from the "public" directory
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

const User = mongoose.model('User', userSchema);

// Handle quiz data (POST request)
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

// Handle profile completion (POST request)
app.post('/api/user/complete-profile', async (req, res) => {
  const { sessionId, email, profileData } = req.body;

  if (!sessionId || !email) {
    return res.status(400).json({ error: 'Missing sessionId or email' });
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

// Fallback route to serve index.html for any unknown routes (important for SPA or refreshes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Set the port variable
const port = process.env.PORT || 5000;

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});