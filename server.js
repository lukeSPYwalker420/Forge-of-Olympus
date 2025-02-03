const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const validator = require('validator');
const nodemailer = require('nodemailer'); 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

  app.use(cors({
    origin: 'https://forge-of-olympus.onrender.com',  // Allow only the frontend URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  }));
  

// Body parser middleware for JSON data
app.use(express.json());

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendPlanEmail(email, exercisePlan, dietPlan) {
  const mailOptions = {
    from: `Forge of Olympus <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Custom Plan is Ready!',
    html: `
      <h1>Your Personalized Fitness Plan</h1>
      <p>Access your dashboard: <a href="https://forge-of-olympus.onrender.com/dashboard">View Plans</a></p>
      
      <h2>Sample Exercises</h2>
      <ul>
        ${exercisePlan.slice(0, 3).map(ex => `<li>${ex.name}</li>`).join('')}
      </ul>
      
      <h2>Sample Meals</h2>
      <ul>
        ${dietPlan.breakfast.slice(0, 2).map(meal => `<li>${meal.name}</li>`).join('')}
      </ul>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Stripe Webhook for payment success
app.post('/api/stripe/webhook', 
  express.raw({type: 'application/json'}),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      try {
        // Get user email from metadata
        const userEmail = session.metadata.email;
        
        // Find user in database
        const user = await User.findOne({ email: userEmail });
        if (!user) throw new Error('User not found');

        // Generate plans
        const { exercise_plan, diet_plan } = await generatePlan(user.toObject());

        // Save plans to user account
        user.plans = {
          exercise: exercise_plan,
          diet: diet_plan,
          generatedAt: new Date()
        };
        await user.save();

        // Send confirmation email
        await sendPlanEmail(userEmail, exercise_plan, diet_plan);
        
      } catch (error) {
        console.error('Post-payment processing failed:', error);
        // Consider implementing retry logic here
      }
    }

    res.json({ received: true });
  }
);

// Catch-all route to serve index.html for any request that doesn't match an API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname));  // Serve index.html as the default
});

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (v) => validator.isEmail(v),
      message: props => `${props.value} is not a valid email!`
    }
  },
  workoutPreferences: { 
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'balance', null],
    default: null
  },
  dietPreferences: {
    type: String,
    enum: ['vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', null],
    default: null
  },
  activityLevel: {
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    required: [true, 'Activity level is required']
  },
  allergies: { 
    type: [String], 
    default: [],
    set: allergies => allergies.map(a => a.toLowerCase().trim())
  },
  medicalConditions: {
    type: [String],
    default: [],
    validate: {
      validator: v => v.length <= 5,
      message: 'Maximum 5 medical conditions allowed'
    }
  },
  mealFrequency: {
    type: String,
    enum: ['3_meals', '4-5_meals', '6+_meals'],
    required: [true, 'Meal frequency is required']
  },
  cookFrequency: {
    type: String,
    enum: ['rarely', 'sometimes', 'frequently'],
    required: [true, 'Cooking frequency is required']
  },
  groceryBudget: {
    type: String,
    enum: ['<100', '100-150', '>150'],
    required: [true, 'Grocery budget is required']
  },
  step: { type: String },  
  measurementPreference: {
    type: String,
    enum: ['metric', 'imperial'],
    default: 'metric'
  },
  followUpAnswers: {
    type: Map,
    of: String,
    validate: {
      validator: map => {
        if (!(map instanceof Map)) return false;
        return Array.from(map.keys()).every(key => isNaN(key)) && map.size <= 10;
      },
      message: 'Follow-up answers must have non-numeric keys and a maximum of 10 entries'
    }
  },
  plans: {
    exercise: { type: mongoose.Schema.Types.Mixed },
    diet: { type: mongoose.Schema.Types.Mixed },
    generatedAt: {
      type: Date,
      validate: {
        validator: v => v <= new Date(),
        message: 'Plan date cannot be in the future'
      }
    }
  },
  stripeCustomerId: {
    type: String,
    index: true,
    sparse: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  strict: 'throw', // Prevents unknown fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add compound indexes for efficient queries
userSchema.index({
  activityLevel: 1,
  mealFrequency: 1,
  measurementPreference: 1
});

// Virtual property for username display
userSchema.virtual('displayName').get(function() {
  return this.email.split('@')[0];
});

// Pre-save hook to prevent null IDs
userSchema.pre('save', function(next) {
  if (this.isNew && !this.stripeCustomerId) {
    this.stripeCustomerId = `cust_${Date.now()}`;
  }
  next();
});

// Middleware to clean followUpAnswers and prevent numeric keys
userSchema.pre('validate', function(next) {
  if (this.followUpAnswers instanceof Map) {
    for (let key of this.followUpAnswers.keys()) {
      if (!isNaN(key)) {
        this.followUpAnswers.delete(key);
      }
    }
  }
  next();
});

// Compile the model
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

const mealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ingredients: { type: [String], required: true },
  calories: { type: Number, required: true },
  macronutrients: {
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fats: { type: Number, required: true },
    fiber: Number,
    sugar: Number
  },
  restrictions: { 
    type: [String],
    validate: {
      validator: function(v) {
        // Validate all restrictions follow "contains-x" format
        return v.every(tag => tag.startsWith('contains-'));
      },
      message: props => `Invalid restriction format: ${props.value}. Must start with 'contains-'`
    }
  },
  mealCategory: { 
    type: String, 
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], 
    required: true 
  },
  type: {
    type: String,
    enum: ['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Mediterranean', null],
    default: null
  },
  price: {  // Added for budget filtering
    type: Number,
    required: true,
    min: 0
  }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);
const Meal = mongoose.model('Meal', mealSchema);

// Read exercise plans from exercise.json
const fs = require('fs');

// Product Configuration (Easy to update)
const PRODUCTS = {
  standard: {
    stripePriceId: 'price_1QjJzPFywsnhFgWfkMFvBVom', 
    features: ['Exercise and Diet Plans', 'Weekly Structured Workout Routines', 'Basic Meal Plans Based on Calorie Needs']
  },
  premium: {
    stripePriceId: 'price_1QjK0LFywsnhFgWfQWxV1ucp', 
    features: ['Fully Personalised Exercise and Diet Plans', 'Adjustments Based On Individual Preferences, Progression, and Feedback', 'More Detailed Meal Plans with Macros']
  }
};

async function getExercises(userData) {
  try {
    // Read and parse the exercise.json file
    const filePath = path.join(__dirname, 'exercise.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const exercisePlans = JSON.parse(data);

    // Initialize an empty array to store tags based on user data
    let tags = [];

    // **Goal Handling**
    if (userData.goal) tags.push(userData.goal);

    // **Workout Frequency**
    if (userData.days_per_week) tags.push(userData.days_per_week);

    // **Exercise Type Preference**
    if (userData.exercise_type_preference) tags.push(userData.exercise_type_preference);

    // **Injury Handling**
    if (!userData.injury_avoidances || userData.injury_avoidances.length === 0) {
      tags.push("No Injuries");
    } else {
      userData.injury_avoidances.forEach(injury => tags.push(injury));
    }

    // **Fitness Level Handling**
    if (userData.fitness_level) tags.push(userData.fitness_level);

    // **Exercise Environment**
    if (userData.exercise_environment) tags.push(userData.exercise_environment);

    // **Focus Type**
    if (userData.focus_type) tags.push(userData.focus_type);

    // **Dietary Restrictions (Optional)**
    if (userData.dietary_restrictions && userData.dietary_restrictions !== "None") {
      tags.push(userData.dietary_restrictions);
    }

    // **Find the best-matching plan**
    let bestMatch = null;
    let maxMatches = 0;

    exercisePlans.forEach(plan => {
      const matchCount = plan.tags.filter(tag => tags.includes(tag)).length;

      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        bestMatch = plan;
      }
    });

    // Return the best-matching plan or null if none found
    return bestMatch || null;

  } catch (error) {
    console.error('Error reading or parsing exercise.json:', error);
    throw new Error('Error fetching exercise plans');
  }
}

function getMeals(userData) {
  // Create a query object for meal filtering
  let query = {
    calories: { $lte: userData.daily_calories },
    mealCategory: { $in: userData.mealTimes }
  };

  // Convert allergies to "contains-x" format and exclude matching meals
  if (userData.dietary_restrictions?.length) {
    const allergyTags = userData.dietary_restrictions.map(a => `contains-${a.toLowerCase()}`);
    query.restrictions = { $nin: allergyTags }; // Exclude meals with these tags
  }

  // Optional: Add budget filter
  if (userData.groceryBudget) {
    query.price = { $lte: userData.groceryBudget };
  }

  // Optional: Macronutrient goals
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
// API Route for merging user data (must be defined after CORS)
app.post('/api/user/merge', async (req, res) => {
  const { email, newData } = req.body;

  if (!email || !newData || typeof newData !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid email/newData' });
  }

  try {
    // Sanitize input
    const sanitizedEmail = validator.normalizeEmail(email);

    // Remove unwanted fields using native destructuring
    const { _id, id, password, ...cleanData } = newData;

    // Ensure strings are trimmed (optional but useful)
    Object.keys(cleanData).forEach(key => {
      if (typeof cleanData[key] === 'string') {
        cleanData[key] = cleanData[key].trim();
      }
    });

    // Update user with proper MongoDB operators
    const user = await User.findOneAndUpdate(
      { email: sanitizedEmail },
      { $set: cleanData },
      { 
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({ success: true, user });
  } catch (error) {
    console.error('Merge error:', error);
    res.status(500).json({ 
      error: 'Data merge failed',
      details: error.message 
    });
  }
});

// Serve static files from the root directory
app.use(express.static(__dirname));  // Serving from the root directory

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

app.post('/api/payment-links', async (req, res) => {
  try {
    const { productId, userEmail } = req.body;
    
    // Validate input
    if (!productId || !userEmail) {
      return res.status(400).json({ error: 'Missing product ID or email' });
    }

    if (!validator.isEmail(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate product exists
    const product = PRODUCTS[productId];
    if (!product) {
      return res.status(400).json({ 
        error: 'Invalid product',
        validProducts: Object.keys(PRODUCTS)
      });
    }

    // Create Stripe payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price: product.stripePriceId,
        quantity: 1
      }],
      metadata: { 
        userEmail: userEmail.toLowerCase().trim(),
        productId,
        tier: product.tier
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`
        }
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
    });

    res.json({
      paymentUrl: paymentLink.url,
      expiresAt: paymentLink.expires_at
    });
    
  } catch (error) {
    console.error('Payment link error:', error);
    res.status(500).json({ 
      error: 'Payment system error',
      details: error.message 
    });
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

// Add after your routes
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate key',
      details: 'This email is already registered'
    });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// Serve the frontend (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname));
});

// Set the port variable
const port = process.env.PORT || 5000;

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });