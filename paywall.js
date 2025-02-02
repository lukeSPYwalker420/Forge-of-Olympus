document.addEventListener("DOMContentLoaded", function () {
    let measurementType = "Metric"; // Default measurement type
    const steps = document.querySelectorAll(".step");
    let currentStep = 0; // Track the current step
    const formData = {}; // Store form data
    let selectedProduct = null; // Store selected product

    // Questions for personal details
    const questions = [
        { label: "What is your sex?", id: "sex", type: "select", options: ["select", "Male", "Female"], required: true },
        { label: "What is your age?", id: "age", type: "number", placeholder: "Enter your age", required: true },
        { label: "What is your height?", id: "height", type: "text", placeholder: "Enter your height in cm", required: true },
        { label: "What is your weight?", id: "weight", type: "text", placeholder: "Enter your weight in kg", required: true },
        { label: "What is your body fat percentage?", id: "body-fat", type: "number", placeholder: "Enter as a percentage", required: false },
        { label: "How active are you?", id: "activity-level", type: "select", options: ["Sedentary", "Lightly active", "Moderately active", "Very active", "Super active"], required: true },
        { label: "Do you have any food allergies?", id: "allergies", type: "select", options: ["None", "Gluten", "Dairy", "Nuts", "Soy", "Eggs", "Shellfish"], required: false, multiple: true },
        { label: "Do you have any medical conditions?", id: "medical-condition", type: "select", options: ["None", "Diabetes", "High cholesterol", "High blood pressure"], required: false, multiple: true },
        { label: "What is your preferred meal frequency?", id: "meal-frequency", type: "select", options: ["3 meals", "4–5 meals", "6+ meals"], required: true },
        { label: "How often do you cook at home?", id: "cook-frequency", type: "select", options: ["Rarely", "Sometimes", "Frequently"], required: true },
        { label: "What is your budget for groceries?", id: "grocery-budget", type: "select", options: ["<100", "100-150", ">150"], required: true },
    ];

    // Validate form data
    const validateForm = (data) => {
        const requiredFields = [
          "username", "email", "password", "confirmPassword",
          "sex", "age", "height", "weight",
          "activity-level", "meal-frequency",
          "cook-frequency", "grocery-budget"
        ];
      
        return requiredFields.every(field => {
          const isValid = !!data[field];
          if (!isValid) console.warn(`Missing required field: ${field}`);
          return isValid;
        });
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
                const select = document.createElement('select');
                select.id = question.id;
                select.multiple = question.multiple || false;
              
                question.options.forEach(option => {
                  const optionElement = document.createElement('option');
                  optionElement.value = option.toLowerCase().replace(/ /g, "-");
                  optionElement.textContent = option;
                  select.appendChild(optionElement);
                });
              
                inputElement = select; // 👈 CRUCIAL ASSIGNMENT
                
                inputElement.addEventListener("change", () => {
                  formData[question.id] = Array.from(select.selectedOptions)
                    .map(option => option.value);
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
        const selectedProduct = selectedProductRadio.value;
    
        // Validate form data
        if (!validateForm(formData)) {
            alert("Please fill in all required fields.");
            return;
        }
    
        // Capture allergies
        const allergySelect = document.getElementById('allergies');
        formData.allergies = Array.from(allergySelect.selectedOptions).map(option => option.value);
    
        try {
            // 1. Save user data
            const saveResponse = await fetch("https://forge-of-olympus.onrender.com/api/user/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    step: "details",
                    data: {
                        ...formData,
                        dietary_restrictions: formData.allergies
                    }
                }),
            });
    
            if (!saveResponse.ok) {
                const errorResult = await saveResponse.json();
                throw new Error(errorResult.error || "Failed to save user data");
            }
    
            // 2. Get dynamic payment link from backend
            const paymentResponse = await fetch("https://forge-of-olympus.onrender.com/api/create-payment-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    product: selectedProduct,
                    email: formData.email
                })
            });
    
            if (!paymentResponse.ok) {
                const errorResult = await paymentResponse.json();
                throw new Error(errorResult.error || "Payment initialization failed");
            }
    
            // 3. Redirect to Stripe
            const { paymentUrl } = await paymentResponse.json();
            window.location.href = paymentUrl;
    
        } catch (error) {
            console.error("Checkout Error:", error);
            alert(error.message || "An error occurred during checkout");
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