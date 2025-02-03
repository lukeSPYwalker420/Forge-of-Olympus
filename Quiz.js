// Initialize data storage for the quiz answers
let answers = [];

const questions = [
    {
        question: "What are your primary fitness goals?",
        choices: ["Weight loss", "Muscle gain", "Improved endurance", "Overall health and wellness", "Athletic performance"],
        follow_up: {
            "Weight loss": {
                question: "How much weight are you looking to lose?",
                choices: ["Less than 5 kg", "5-10 kg", "10-20 kg", "More than 20 kg"]
            },
            "Muscle gain": {
                question: "How much muscle are you looking to gain?",
                choices: ["Less than 5 kg", "5-10 kg", "10-20 kg", "More than 20 kg"]
            },
            "Improved endurance": {
                question: "What areas of endurance are you focusing on?",
                choices: ["Cardiovascular fitness", "Muscular endurance", "Mix of both"]
            },
            "Flexibility": {
                question: "What areas of flexibility are you working on?",
                choices: ["Leg flexibility", "Back flexibility", "Full-body flexibility", "Shoulder Flexibility", "Hip flexibility", "overall flexibility"]
            },
            "Overall health and wellness": {
                question: "Are there any specific health conditions you're managing?",
                choices: ["Yes", "No", "Prefer not to say"],
            },
            "Improved mental health": {
                question: "What mental health improvements are you aiming for?",
                choices: ["Reduced stress", "Improved focus", "Better sleep", "Increased mood"],
            },
            "Athletic performance": {
                question: "Which area of athletic performance are you aiming to improve?",
                choices: ["Speed", "Strength", "Endurance", "Agility", "Flexibility"]
            }
        }
    },
    {
        question: "What type of exercise do you prefer?",
        choices: ["Strength training", "Cardio", "Yoga/Pilates", "Mixed routine"]
    },
    {
        question: "How many days a week are you able to commit to working out?",
        choices: ["1-2 days", "3-4 days", "5-6 days", "Every day"]
    },
    {
        question: "What is your current fitness level?",
        choices: ["Beginner", "Intermediate", "Advanced"]
    },
    {
        question: "Do you have any dietary restrictions or preferences?",
        choices: ["None", "Vegetarian", "Vegan", "Gluten-free", "Paleo", "Keto"]
    },
    {
        question: "Do you have any injuries that need to be considered when planning your exercises?",
        choices: ["Yes", "No"],
        follow_up: {
            "Yes": {
                question: "Please select any injuries you have:",
                choices: ["Back injury", "Knee injury", "Shoulder injury", "Elbow injury", "Wrist injury", "Hip injury", "Ankle injury"],
                is_multiple_choice: true,
                follow_up: {
                    "Back injury": {
                        question: "Please provide details about your back injury:",
                        choices: ["Lower back pain", "Upper back pain", "Sciatica", "Spinal issues"]
                    },
                    "Knee injury": {
                        question: "Please provide details about your knee injury:",
                        choices: ["Patellar tendinitis", "Meniscus tear", "Ligament injury"]
                    },
                    "Shoulder injury": {
                        question: "Please provide details about your shoulder injury:",
                        choices: ["Rotator cuff injury", "Shoulder dislocation", "Frozen shoulder"]
                    },
                    "Elbow injury": {
                        question: "Please provide details about your elbow injury:",
                        choices: ["Tennis elbow", "Golfer's elbow", "Ligament injury"]
                    },
                    "Wrist injury": {
                        question: "Please provide details about your wrist injury:",
                        choices: ["Carpal tunnel", "Sprain", "Fracture"]
                    },
                    "Hip injury": {
                        question: "Please provide details about your hip injury:",
                        choices: ["Hip labral tear", "Hip flexor strain", "Arthritis"]
                    },
                    "Ankle injury": {
                        question: "Please provide details about your ankle injury:",
                        choices: ["Sprain", "Fracture", "Tendonitis"]
                    }
                }
            }
        }
    },
    {
        question: "Do you have any medical conditions that may affect your ability to exercise?",
        choices: ["Yes", "No", "prefer not to say"],
        follow_up: {
            "Yes": {
                question: "Please select any medical conditions you have:",
                choices: ["High blood pressure", "Diabetes", "Asthma", "Arthritis", "Heart disease", "Depression", "Anxiety", "Thyroid disorder"],
                is_multiple_choice: true,
                follow_up: {
                    "High blood pressure": {
                        question: "How well is your high blood pressure managed?",
                        choices: ["Well managed", "Moderately managed", "Poorly managed"]
                    },
                    "Diabetes": {
                        question: "What type of diabetes do you have?",
                        choices: ["Type 1", "Type 2", "gestational diabetes"]
                    },
                    "Asthma": {
                        question: "How well is your asthma managed?",
                        choices: ["Well managed", "Moderately managed", "Poorly managed"]
                    },
                    "Arthritis": {
                        question: "What type of arthritis do you have?",
                        choices: ["Osteoarthritis", "Rheumatoid arthritis", "Psoriatic arthritis"]
                    },
                    "Heart disease": {
                        question: "What type of heart disease do you have?",
                        choices: ["Coronary artery disease", "Heart failure", "Arrhythmia"]
                    },
                    "Depression": {
                        question: "How well is your depression managed?",
                        choices: ["Well managed", "Moderately managed", "Poorly managed"]
                    },
                    "Anxiety": {
                        question: "How well is your anxiety managed?",
                        choices: ["Well managed", "Moderately managed", "Poorly managed"]
                    }
                }
            }
        }
    },
    {
        question: "What is your preferred exercise environment?",
        choices: ["Gym", "Home", "Outdoor", "No preference"]
    },
    {
        question: "How well do you manage sleep and recovery?",
        choices: ["Very well", "Moderately well", "Not well", "I struggle with sleep and recovery"]
    },
    {
        question: "How motivated are you to achieve your fitness goals?",
        choices: ["Highly motivated", "Moderately motivated", "Not very motivated", "I'm just getting started"]
    }
];

let currentQuestionIndex = 0;
let currentFollowUp = null;

function renderQuestion() {
    const questionContainer = document.getElementById('question-container');
    const questionData = currentFollowUp || questions[currentQuestionIndex];

    if (!questionData) {
        console.error("No question data available!");
        return;
    }

    questionContainer.classList.remove('fade-in');
    questionContainer.classList.add('fade-out');

    setTimeout(() => {
        questionContainer.innerHTML = `
            <div class="question-content">
                <h2 class="question">${questionData.question}</h2>
                <div id="goal-buttons" class="goal-buttons"></div>
            </div>
        `;

        const goalButtons = document.getElementById('goal-buttons');
        questionData.choices.forEach(choice => {
            const button = document.createElement('button');
            button.classList.add('goal-btn');
            button.textContent = choice;
            button.onclick = () => handleAnswer(choice);
            goalButtons.appendChild(button);
        });

        questionContainer.classList.remove('fade-out');
        questionContainer.classList.add('fade-in');
    }, 500);
}

function handleAnswer(choice) {
    const questionData = currentFollowUp ? currentFollowUp : questions[currentQuestionIndex];

    if (!questionData) {
        console.error("No question data available!");
        return;
    }

    // Manage answers
    const existingAnswer = answers.find(a => a.question === questionData.question);
    if (questionData.is_multiple_choice) {
        if (!existingAnswer) {
            answers.push({ question: questionData.question, answer: [] });
        }
        answers.find(a => a.question === questionData.question).answer.push(choice);
    } else {
        if (existingAnswer) {
            existingAnswer.answer = choice;
        } else {
            answers.push({ question: questionData.question, answer: choice });
        }
    }

    // Handle follow-up or move to next question
    if (questionData.follow_up && questionData.follow_up[choice]) {
        currentFollowUp = JSON.parse(JSON.stringify(questionData.follow_up[choice]));
    } else {
        currentFollowUp = null;
        currentQuestionIndex++;
    }

    // Render next question or show results
    if (currentQuestionIndex < questions.length || currentFollowUp) {
        renderQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    const resultContainer = document.getElementById("result-container");
    const resultSummary = document.getElementById("result-summary");

    document.querySelector(".question-container").style.display = "none";

    const formattedAnswers = answers
        .map(answer => `${answer.question}: ${Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer}`)
        .join("\n");

    resultSummary.textContent = formattedAnswers;
    resultContainer.style.display = "block";
}

function attachEmailInput() {
    const resultContainer = document.getElementById('result-container');
    let emailInputContainer = document.querySelector('.email-input-container');
    if (emailInputContainer) {
        console.warn("Email input container already exists.");
        return;
    }

    emailInputContainer = document.createElement('div');
    emailInputContainer.classList.add('email-input-container');

    const emailLabel = document.createElement('label');
    emailLabel.setAttribute('for', 'email');
    emailLabel.textContent = 'Enter your email to finalize:';
    emailInputContainer.appendChild(emailLabel);

    const emailInput = document.createElement('input');
    emailInput.setAttribute('type', 'email');
    emailInput.setAttribute('id', 'email');
    emailInput.setAttribute('name', 'email');
    emailInput.required = true;
    emailInputContainer.appendChild(emailInput);

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit';
    submitButton.classList.add('submit-btn');

    // Attach event listener to the button
    submitButton.addEventListener('click', function(event) {
        event.preventDefault();
        submitButton.disabled = true;  // Disable the button to prevent multiple submissions
        finalizeAndSubmit(event);
        console.log('Submit button clicked');
    });

    emailInputContainer.appendChild(submitButton);

    // Ensure static submit button is removed before adding dynamic one
    const staticSubmitButton = document.getElementById('submit-btn');
    if (staticSubmitButton) {
        staticSubmitButton.parentElement.removeChild(staticSubmitButton);
    }

    resultContainer.appendChild(emailInputContainer);
}

// Handle final submission with email and user data
// MODIFIED FINALIZE AND SUBMIT FUNCTION
function finalizeAndSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
  
    if (!email || !isValidEmail(email)) {
      alert("Please enter a valid email.");
      return;
    }
  
    // Transform answers to match backend schema
    const transformAnswers = (rawAnswers) => {
      const transformed = {
        // Map exercise preferences
        workoutPreferences: {
          "Strength training": "strength",
          "Cardio": "cardio",
          "Yoga/Pilates": "flexibility",
          "Mixed routine": "balance"
        }[rawAnswers.find(a => a.question === "What type of exercise do you prefer?")?.answer] || null,
  
        // Map diet preferences
        dietPreferences: rawAnswers.find(a => a.question === "Do you have any dietary restrictions or preferences?")?.answer
          ?.toLowerCase().replace('-free', '') || null,
  
        // Map activity level
        activityLevel: {
          "Beginner": "light",
          "Intermediate": "moderate",
          "Advanced": "active"
        }[rawAnswers.find(a => a.question === "What is your current fitness level?")?.answer] || "moderate",
  
        // Medical conditions (limit to 5)
        medicalConditions: rawAnswers
          .find(a => a.question === "Please select any medical conditions you have:")?.answer
          ?.slice(0,5).map(c => c.toLowerCase()) || [],
  
        // Add temporary defaults for required fields
        mealFrequency: "3_meals",
        cookFrequency: "sometimes",
        groceryBudget: "100-150"
      };
  
      // Add nested follow-up answers
      const followUpMap = new Map();
      rawAnswers.forEach(answer => {
        if (answer.question.includes("details about")) {
          followUpMap.set(answer.question.split("details about ")[1], answer.answer);
        }
      });
      
      transformed.followUpAnswers = followUpMap;
  
      return transformed;
    };
  
    const cleanBackendData = transformAnswers(answers);
    
    const finalData = { 
      email: email.toLowerCase().trim(),
      newData: cleanBackendData
    };
  
    fetch('https://forge-of-olympus.onrender.com/api/user/merge', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(finalData)
    })
    .then(async (response) => {
      if (!response.ok) throw new Error(await response.text());
      window.location.href = 'paywall.html';
    })
    .catch(error => {
      console.error('Error:', error);
      alert(`Merge failed: ${error.message}`);
    });
  }

// Listen for submit button click
document.getElementById('submit-btn').addEventListener('click', function(event) {
    console.log('Submit button clicked'); // Debug log to confirm button click
    finalizeAndSubmit(event);
});

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

renderQuestion();