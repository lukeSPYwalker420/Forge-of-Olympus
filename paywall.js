document.addEventListener("DOMContentLoaded", function () {
    let measurementType = "Metric"; // Default measurement type
    const steps = document.querySelectorAll(".step");
    let currentStep = 0; // Track the current step in the form
    const formData = {}; // Store form data
    let selectedProduct = null; // Store selected product for payment
    
        // Define the questions for personal details
        const questions = [
            { label: "What is your sex?", id: "sex", type: "select", options: ["Male", "Female"], required: true },
            { label: "What is your age?", id: "age", type: "number", placeholder: "Enter your age", required: true },
            { label: "What is your height?", id: "height", type: "text", placeholder: "Enter your height", required: true },
            { label: "What is your weight?", id: "weight", type: "text", placeholder: "Enter your weight", required: true },
            { label: "What is your body fat percentage?", id: "body-fat", type: "number", placeholder: "Enter as a percentage", required: false },
            { label: "How active are you?", id: "activity-level", type: "select", options: ["Sedentary", "Lightly active", "Moderately active", "Very active", "Super active"], required: true },
            { label: "Do you have any food allergies?", id: "allergies", type: "select", options: ["None", "Gluten", "Dairy", "Nuts", "Soy", "Eggs", "Shellfish"], required: false },
            { label: "Do you have any medical conditions?", id: "medical-condition", type: "select", options: ["None", "Diabetes", "High cholesterol", "High blood pressure"], required: false },
            { label: "What is your preferred meal frequency?", id: "meal-frequency", type: "select", options: ["3 meals", "4–5 meals", "6+ meals"], required: true },
            { label: "How often do you cook at home?", id: "cook-frequency", type: "select", options: ["Rarely", "Sometimes", "Frequently"], required: true },
            { label: "What is your budget for groceries?", id: "grocery-budget", type: "select", options: ["<100", "100-150", ">150"], required: true },
            { label: "Would you prefer metric or imperial?", id: "measurement-preference", type: "select", options: ["Metric", "Imperial"], required: true }
        ];
    
        // Function to move to next step in form
        const moveToNextStep = () => {
            steps[currentStep].classList.remove("active");
            currentStep++;
            steps[currentStep].classList.add("active");
    
            const progress = (currentStep / steps.length) * 100;
            document.getElementById("progress").style.width = `${progress}%`;
    
            const nextButton = document.getElementById("next-button");
            if (nextButton) {
                nextButton.disabled = false;  // Ensure it’s not disabled
            }
        };
    
        // Event listener to handle form submission
        document.getElementById("user-profile-form").addEventListener("submit", async (event) => {
            event.preventDefault();
    
            // Capture all fields and store them in formData
            formData.username = document.getElementById("username").value;
            formData.email = document.getElementById("email").value;
            formData.password = document.getElementById("password").value;
            formData.confirmPassword = document.getElementById("confirm-password").value;
    
            // Capture the additional user profile fields
            formData.sex = document.getElementById("sex").value;
            formData.age = document.getElementById("age").value;
            formData.height = document.getElementById("height").value;
            formData.weight = document.getElementById("weight").value;
            formData.bodyFat = document.getElementById("body-fat").value;
            formData.activityLevel = document.getElementById("activity-level").value;
            formData.allergies = document.getElementById("allergies").value;
            formData.medicalCondition = document.getElementById("medical-condition").value;
            formData.mealFrequency = document.getElementById("meal-frequency").value;
            formData.cookFrequency = document.getElementById("cook-frequency").value;
            formData.groceryBudget = document.getElementById("grocery-budget").value;
            formData.measurementPreference = document.getElementById("measurement-preference").value;
    
            console.log("User data captured:", formData);
    
            // Check if formData is valid
            if (!validateForm(formData)) {
                alert("Please fill in all required fields.");
                return;
            }
    
            // Send data to backend (API) for the 'details' step
            try {
                const response = await fetch("https://forge-of-olympus.onrender.com/api/user/process", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        step: "details",  // Specify the step
                        data: simulatedFormData,
                    }),
                });                
    
                const result = await response.json();
                if (response.ok) {
                    console.log("Data saved:", result);  // Handle successful save
                    moveToNextStep();  // Proceed to the next step
                } else {
                    console.error("Error:", result.error);  // Handle error response
                    alert("There was an issue saving your data. Please try again.");
                }
            } catch (error) {
                console.error("Error submitting data:", error);  // Handle network or other errors
                alert("An unexpected error occurred. Please try again.");
            }
        });
    
        // Validate form data before submission
        const validateForm = (data) => {
            const requiredFields = [
                "username", "email", "password", "confirmPassword", "sex", "age", "height", "weight", "activityLevel", 
                "mealFrequency", "cookFrequency", "groceryBudget", "measurementPreference"
            ];
    
            for (const field of requiredFields) {
                if (!data[field]) {
                    return false; // Return false if any required field is missing
                }
            }
            return true; // All required fields are present
        };
    
        const productRadios = document.querySelectorAll('input[name="product"]');
        productRadios.forEach(radio => {
            radio.addEventListener("change", () => {
                formData.product = radio.value; // Store the selected product
                console.log("Product selected:", formData.product);  // Debug log
            });
        });
    
        // Function to create dynamic form elements for each question
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
        
                    // Use `change` event for select inputs
                    inputElement.addEventListener("change", () => {
                        formData[question.id] = inputElement.value;
                        console.log("Form data updated:", formData);
                    });
                } else {
                    inputElement = document.createElement('input');
                    inputElement.type = question.type;
                    inputElement.placeholder = question.placeholder;
        
                    // Use `input` event for text/number inputs
                    inputElement.addEventListener("input", () => {
                        formData[question.id] = inputElement.value;
                        console.log("Form data updated:", formData);
                    });
                }
        
                div.appendChild(label);
                div.appendChild(inputElement);
                personalDetailsSection.appendChild(div);
            });
    
            // Insert the user profile form after personal details questions
            const userProfileSection = document.getElementById("user-profile-section");
            userProfileSection.style.display = "block"; // Make it visible now
        };

        document.getElementById("test-submit-btn").addEventListener("click", async () => {
            // Simulate form data (this is where you'd insert the test data)
            const simulatedFormData = {
                username: "TestUser",
                email: "testuser@example.com",
                password: "password123",
                confirmPassword: "password123",
                sex: "Male",
                age: "25",
                height: "180",
                weight: "75",
                bodyFat: "12",
                activityLevel: "Moderately active",
                allergies: "None",
                medicalCondition: "None",
                mealFrequency: "3 meals",
                cookFrequency: "Frequently",
                groceryBudget: "100-150",
                measurementPreference: "Metric",
                product: "premium" // Assuming you have a product field
            };
        
            try {
                // Send data to backend (use the appropriate API endpoint)
                const response = await fetch("http://localhost:5000/api/user/process", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        step: "details",  // Specify the step
                        data: simulatedFormData,
                    }),
                });
        
                const result = await response.json();
                if (response.ok) {
                    console.log("Data saved:", result);  // Success
                } else {
                    console.error("Error:", result.error);  // Error
                }
            } catch (error) {
                console.error("Error submitting data:", error);  // Network or other errors
            }
        });                  
    
        // Initial render of personal details questions
        createQuestionElements(questions);
    
        // Toggle between metric and imperial measurement system
        document.getElementById('metric-tab').addEventListener('click', () => {
            measurementType = "Metric";
            createQuestionElements(questions);
        });
    
        document.getElementById('imperial-tab').addEventListener('click', () => {
            measurementType = "Imperial";
            createQuestionElements(questions);
        });
    });