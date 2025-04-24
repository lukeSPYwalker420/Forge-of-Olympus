const express = require('express');
const stripe = require('stripe')('secret key');  // Use your secret key
const app = express();

app.use(express.json());

app.post('/create-payment-intent', async (req, res) => {
    const { token, formData } = req.body; // Expecting both token and formData from the frontend

    try {
        // Extract form data fields (they won't affect payment calculation)
        const { weight, height, age, activityLevel, allergies, medicalCondition, mealFrequency, groceryBudget, measurementPreference } = formData;

        // Fixed amount for the payment (in cents)
        let amount = 1000;  // Example: $10.00 or £10.00
        let currency = 'gbp';  // Default currency (can be adjusted based on needs)

        // Create a payment intent for the fixed amount
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,  // Use static payment amount
            currency: currency,  // Use static currency
            payment_method: token,  // Payment method token received from frontend
            confirm: true,  // Automatically confirm the payment
        });

        // Send back a success response
        res.send({ success: true });
    } catch (err) {
        // Send error response if there's an issue
        res.status(500).send({ success: false, error: err.message });
    }
});

app.listen(3000, () => console.log('Server is running on port 3000'));
