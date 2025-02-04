const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const validator = require('validator');
const Joi = require('joi');
const nodemailer = require('nodemailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ======================
// INITIAL CONFIGURATION
// ======================
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ======================
// DATABASE CONNECTION
// ======================
mongoose.connect(process.env.USER_DB_URI, {
  connectTimeoutMS: 5000
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// ======================
// MIDDLEWARE
// ======================
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://forge-of-olympus.onrender.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(__dirname));

// ======================
// SCHEMAS & MODELS
// ======================
const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: v => validator.isEmail(v),
      message: props => `${props.value} is not a valid email!`
    }
  },
  workoutPreferences: { 
    type: String,
    enum: ['strength', 'cardio', 'Yoga/Pilates', 'Mixed routine', null],
    default: null
  },
  dietPreferences: {
    type: String,
    enum: ['none', 'vegetarian', 'vegan', 'gluten', 'paleo', 'keto', null],
    set: v => v?.replace(/-free$/, '') || null,
    default: null
  },
  activityLevel: {
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    default: 'moderate'
  },
  fitnessLevel: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    required: true
  },
  exerciseFrequency: {
    type: String,
    enum: ["1-2 days", "3-4 days", "5-6 days", "Every day"],
    required: true
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
    required: true
  },
  cookFrequency: {
    type: String,
    enum: ['rarely', 'sometimes', 'frequently'],
    required: true
  },
  groceryBudget: {
    type: String,
    enum: ['<100', '100-150', '>150'],
    required: true
  },
  followUpAnswers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    validate: {
      validator: map => map.size <= 20,
      message: 'Maximum 20 follow-up answers allowed'
    }
  },
  plans: {
    exercise: { type: mongoose.Schema.Types.Mixed },
    diet: { type: mongoose.Schema.Types.Mixed },
    generatedAt: {
      type: Date,
      default: Date.now,
      validate: {
        validator: v => v <= Date.now(),
        message: 'Plan date cannot be in the future'
      }
    }
  },
  stripeCustomerId: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const User = mongoose.model('User', UserSchema);

// ======================
// VALIDATION SCHEMAS
// ======================
const mergeSchema = Joi.object({
  email: Joi.string().email().required(),
  newData: Joi.object({
    workoutPreferences: Joi.string().valid('strength', 'cardio', 'Yoga/Pilates', 'Mixed routine'),
    dietPreferences: Joi.string().valid('none', 'vegetarian', 'vegan', 'gluten', 'paleo', 'keto'),
    activityLevel: Joi.string().valid('sedentary', 'light', 'moderate', 'active', 'very_active'),
    medicalConditions: Joi.array().items(Joi.string()).max(5)
  }).required()
});

// ======================
// EMAIL SERVICE
// ======================
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendPlanEmail(email, exercisePlan, dietPlan) {
  try {
    await transporter.sendMail({
      from: `Forge of Olympus <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Custom Plan is Ready!',
      html: generateEmailContent(exercisePlan, dietPlan)
    });
  } catch (error) {
    console.error('Email send failed:', error);
  }
}

// ======================
// STRIPE INTEGRATION
// ======================
const PRODUCTS = {
  standard: { priceId: 'price_1QjJzPFywsnhFgWfkMFvBVom' },
  premium: { priceId: 'price_1QjK0LFywsnhFgWfQWxV1ucp' }
};

async function createStripeSession(userEmail, priceId) {
  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    metadata: { userEmail }
  });
}

// ======================
// CORE FUNCTIONALITY
// ======================
app.post('/api/user/merge', async (req, res) => {
  try {
    // Validation
    const { error } = mergeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, newData } = req.body;
    const sanitizedEmail = validator.normalizeEmail(email);

    // Database operation
    const user = await User.findOneAndUpdate(
      { email: sanitizedEmail },
      { $set: newData },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, user });
  } catch (error) {
    handleServerError(res, error, 'Merge failed');
  }
});

app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const user = await User.findOne({ email: session.metadata.userEmail });
      
      if (!user) throw new Error('User not found');
      
      const plans = await generatePlan(user.toObject());
      user.plans = plans;
      await user.save();
      
      await sendPlanEmail(user.email, plans.exercise_plan, plans.diet_plan);
    }

    res.json({ received: true });
  } catch (error) {
    handleServerError(res, error, 'Webhook processing failed');
  }
});

// ======================
// HELPER FUNCTIONS
// ======================
function handleServerError(res, error, context) {
  console.error(`${context}:`, error);
  const status = error.statusCode || 500;
  res.status(status).json({ 
    error: context,
    details: error.message 
  });
}

function generateEmailContent(exercisePlan, dietPlan) {
  return `
    <h1>Your Personalized Fitness Plan</h1>
    <p>Access your dashboard: <a href="${process.env.FRONTEND_URL}/dashboard">View Plans</a></p>
    <h2>Sample Exercises</h2>
    <ul>${exercisePlan.slice(0, 3).map(ex => `<li>${ex.name}</li>`).join('')}</ul>
    <h2>Sample Meals</h2>
    <ul>${dietPlan.breakfast.slice(0, 2).map(meal => `<li>${meal.name}</li>`).join('')}</ul>
  `;
}

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
  // Validate core user data
  if (!userData || !userData.activityLevel || !userData.fitnessLevel) {
    throw new Error('Invalid user data for plan generation');
  }

  // Calculate nutritional needs
  const tdee = calculateTDEE(
    userData.weight,
    userData.height,
    userData.age,
    userData.activityLevel,
    userData.bodyFatPercentage
  );

  // Get filtered exercises with injury considerations
  const exercises = await getExercises({
    goals: userData.fitnessGoals,
    equipmentAvailability: userData.exerciseEnvironment === 'Home' ? 'bodyweight' : 'full',
    injuryAvoidance: Array.from(userData.followUpAnswers?.values() || []),
    daysAvailable: userData.exerciseFrequency.match(/\d+/)?.[0] || 3,
    fitnessLevel: userData.fitnessLevel
  });

  // Generate periodized workout schedule
  const exercisePlan = createPeriodizedPlan(
    exercises,
    userData.exerciseFrequency,
    userData.workoutPreferences
  );

  // Get dietary-appropriate meals
  const meals = await getMeals({
    dietaryRestrictions: userData.dietPreferences,
    allergies: userData.allergies,
    calories: tdee,
    budget: userData.groceryBudget,
    cookFrequency: userData.cookFrequency
  });

  // Structure meal plan according to preferences
  const mealPlan = buildMealSchedule({
    meals,
    mealFrequency: userData.mealFrequency,
    cookingTime: userData.cookFrequency === 'frequently' ? 'high' : 'low',
    calorieTarget: tdee
  });

  return {
    exercise_plan: {
      schedule: exercisePlan,
      progression: createProgressionStrategy(userData.fitnessLevel),
      recoveryTips: generateRecoveryTips(userData.medicalConditions)
    },
    diet_plan: {
      meals: mealPlan,
      nutritionalSummary: calculateMacronutrients(mealPlan),
      shoppingList: generateShoppingList(mealPlan, userData.groceryBudget)
    }
  };
}

// Helper function for workout periodization
function createPeriodizedPlan(exercises, frequency, preferences) {
  const daysPerWeek = parseInt(frequency.match(/\d+/)[0]) || 3;
  const splitType = getSplitType(daysPerWeek, preferences);
  
  return Array.from({length: daysPerWeek}, (_, i) => ({
    day: i + 1,
    focus: splitType[i % splitType.length],
    exercises: exercises
      .filter(ex => ex.goal.includes(splitType[i % splitType.length]))
      .sort((a,b) => a.difficulty - b.difficulty)
      .slice(0, 5)
  }));
}

// Meal schedule builder with portion control
function buildMealSchedule({ meals, mealFrequency, cookingTime, calorieTarget }) {
  const mealCategories = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const mealsPerDay = parseInt(mealFrequency.charAt(0));

  return Array.from({length: 7}, () => ({
    day: new Date().getDay(),
    meals: mealCategories.slice(0, mealsPerDay).map(category => ({
      category,
      options: meals
        .filter(m => m.mealCategory === category)
        .filter(m => cookingTime === 'high' ? m.prepTime <= 30 : m.prepTime <= 15)
        .slice(0, 3)
    })),
    calorieTotal: Math.floor(calorieTarget / mealsPerDay)
  }));
}
// API Route for merging user data (must be defined after CORS)
// MODIFIED MERGE ENDPOINT
app.post('/api/user/merge', async (req, res) => {
  try {
    const { email, newData } = req.body;
    const sanitizedEmail = validator.normalizeEmail(email);

    // Schema-compatible data transformation
    const transformForSchema = (data) => ({
      workoutPreferences: data.workoutPreferences,
      dietPreferences: data.dietPreferences?.replace(' ', '_'),
      activityLevel: data.activityLevel,
      medicalConditions: data.medicalConditions,
      mealFrequency: data.mealFrequency,
      cookFrequency: data.cookFrequency,
      groceryBudget: data.groceryBudget,
      followUpAnswers: data.followUpAnswers instanceof Map 
        ? data.followUpAnswers 
        : new Map(Object.entries(data.followUpAnswers || {}))
    });

    const updateData = transformForSchema(newData);

    const user = await User.findOneAndUpdate(
      { email: sanitizedEmail },
      { $set: updateData },
      { 
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({ success: true, user });
  } catch (error) {
    console.error('Merge Error:', {
      input: req.body,
      error: error.message
    });
    res.status(500).json({
      error: 'Merge failed',
      details: error.message,
      requiredFields: ['workoutPreferences', 'activityLevel', 'dietPreferences']
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