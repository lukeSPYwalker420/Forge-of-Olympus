document.addEventListener("DOMContentLoaded", function () {
    let measurementType = "Metric"; // Default measurement type
    const steps = document.querySelectorAll(".step");
    let currentStep = 0; // Track the current step
    const formData = {}; // Store form data
    let selectedProduct = null; // Store selected product

    // Questions for personal details
    const questions = [
        { label: "What is your sex?", id: "sex", type: "select", options: ["Male", "Female"], required: true },
        { label: "What is your age?", id: "age", type: "number", placeholder: "Enter your age", required: true },
        { label: "What is your height?", id: "height", type: "text", placeholder: "Enter your height in cm", required: true },
        { label: "What is your weight?", id: "weight", type: "text", placeholder: "Enter your weight in kg", required: true },
        { label: "What is your body fat percentage?", id: "body-fat", type: "number", placeholder: "Enter as a percentage", required: false },
        { label: "How active are you?", id: "activity-level", type: "select", options: ["Sedentary", "Lightly active", "Moderately active", "Very active", "Super active"], required: true },
        { label: "Do you have any food allergies?", id: "allergies", type: "select", options: ["None", "Gluten", "Dairy", "Nuts", "Soy", "Eggs", "Shellfish"], required: false },
        { label: "Do you have any medical conditions?", id: "medical-condition", type: "select", options: ["None", "Diabetes", "High cholesterol", "High blood pressure"], required: false },
        { label: "What is your preferred meal frequency?", id: "meal-frequency", type: "select", options: ["3 meals", "4–5 meals", "6+ meals"], required: true },
        { label: "How often do you cook at home?", id: "cook-frequency", type: "select", options: ["Rarely", "Sometimes", "Frequently"], required: true },
        { label: "What is your budget for groceries?", id: "grocery-budget", type: "select", options: ["<100", "100-150", ">150"], required: true },
        { label: "Would you prefer metric or imperial?", id: "measurement-preference", type: "select", options: ["Metric", "Imperial"], required: true }
    ];

    // Move to next step
    const moveToNextStep = () => {
        steps[currentStep].classList.remove("active");
        currentStep++;
        steps[currentStep].classList.add("active");

        const progress = (currentStep / steps.length) * 100;
        document.getElementById("progress").style.width = `${progress}%`;
    };

    // Validate form data
    const validateForm = (data) => {
        const requiredFields = [
            "username", "email", "password", "confirmPassword", "sex", "age", "height", "weight", "activityLevel",
            "mealFrequency", "cookFrequency", "groceryBudget", "measurementPreference"
        ];
        return requiredFields.every(field => data[field]);
    };

    // Create dynamic form elements
    const createQuestionElements = (questions) => {
        const personalDetailsSection = document.getElementById("personal-details");
        personalDetailsSection.innerHTML = ''; // Clear existing content

        questions.forEach(question => {
            const div = document.createElement('div');
            div.classList.add('question');

            const label = document.createElement('label');
            label.setAttribute('for', question.id);
            label.textContent = question.label;

            let inputElement;
            if (question.type === 'select') {
                inputElement = document.createElement('select');
                inputElement.id = question.id;
                question.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.toLowerCase().replace(/ /g, "-");
                    optionElement.textContent = option;
                    inputElement.appendChild(optionElement);
                });

                inputElement.addEventListener("change", () => {
                    formData[question.id] = inputElement.value;
                });
            } else {
                inputElement = document.createElement('input');
                inputElement.type = question.type;
                inputElement.placeholder = question.placeholder;

                // Update placeholders for height and weight based on measurement type
                if (question.id === "height") {
                    inputElement.placeholder = measurementType === "Metric" ? "Enter your height in cm" : "Enter your height in inches";
                }
                if (question.id === "weight") {
                    inputElement.placeholder = measurementType === "Metric" ? "Enter your weight in kg" : "Enter your weight in lbs";
                }

                inputElement.addEventListener("input", () => {
                    formData[question.id] = inputElement.value;
                });
            }

            div.appendChild(label);
            div.appendChild(inputElement);
            personalDetailsSection.appendChild(div);
        });

        document.getElementById("user-profile-section").style.display = "block";
    };

    // Handle "Next: Payment Details" button click
    document.getElementById("next-step-btn").addEventListener("click", async () => {
        // Capture form data
        formData.username = document.getElementById("username").value;
        formData.email = document.getElementById("email").value;
        formData.password = document.getElementById("password").value;
        formData.confirmPassword = document.getElementById("confirm-password").value;

        // Capture selected product
        const selectedProductRadio = document.querySelector('input[name="product"]:checked');
        if (!selectedProductRadio) {
            alert("Please select a plan.");
            return;
        }
        selectedProduct = selectedProductRadio.value;

        // Validate form data
        if (!validateForm(formData)) {
            alert("Please fill in all required fields.");
            return;
        }

        // Save user details to backend
        try {
            const response = await fetch("https://forge-of-olympus.onrender.com/api/user/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ step: "details", data: formData }),
            });

            const result = await response.json();
            if (response.ok) {
                console.log("Data saved:", result);

                // Redirect to Stripe paywall based on selected product
                const paymentLinks = {
                    standard: "https://buy.stripe.com/test_fZe4ircZv6dM0mY000", // Standard plan link
                    premium: "https://buy.stripe.com/test_14kcOXcZvcCa7Pq4gh", // Premium plan link
                };

                // Redirect to the appropriate Stripe paywall
                window.location.href = paymentLinks[selectedProduct];
            } else {
                console.error("Error:", result.error);
                alert("There was an issue saving your data. Please try again.");
            }
        } catch (error) {
            console.error("Error submitting data:", error);
            alert("An unexpected error occurred. Please try again.");
        }
    });

    // Toggle between metric and imperial measurement system
    document.getElementById('metric-tab').addEventListener('click', () => {
        measurementType = "Metric";
        document.getElementById('metric-tab').classList.add('active');
        document.getElementById('imperial-tab').classList.remove('active');
        createQuestionElements(questions); // Re-render questions with updated placeholders
    });

    document.getElementById('imperial-tab').addEventListener('click', () => {
        measurementType = "Imperial";
        document.getElementById('imperial-tab').classList.add('active');
        document.getElementById('metric-tab').classList.remove('active');
        createQuestionElements(questions); // Re-render questions with updated placeholders
    });

    // Initial render
    createQuestionElements(questions);
});