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


const questionContainer = document.getElementById("question-container");

document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", (event) => {
        if (event.target.classList.contains("goal-btn")) {
            handleAnswer(event.target.textContent);
        } else if (event.target.classList.contains("back-btn")) {
            goBack();
        }
    });

    renderQuestion(); // Call renderQuestion after DOM is fully loaded
});

function renderQuestion() {
    if (!questionContainer) {
        console.error("Error: questionContainer is not defined!");
        return;
    }

    const questionData = quizState.currentFollowUp || questions[quizState.currentQuestionIndex];
    const errorMessage = quizState.validationErrors[questionData.question];

    questionContainer.innerHTML = `
      <div class="question-content">
        <h2 class="question">${questionData.question}</h2>
        ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
        <div id="goal-buttons" class="goal-buttons">
          ${questionData.choices.map(choice => `
            <button class="goal-btn">${choice}</button>
          `).join('')}
        </div>
        ${quizState.history.length > 0 ? `<button class="back-btn">← Back</button>` : ''}
      </div>
    `;
}

const quizState = {
    currentQuestionIndex: 0,
    currentFollowUp: null,
    answers: [],
    history: [], // Track user navigation
    validationErrors: {} // Track validation issues
  };

  function handleAnswer(choice) {
    const questionData = quizState.currentFollowUp || questions[quizState.currentQuestionIndex];
  
    // Validate answer
    if (!validateAnswer(questionData, choice)) {
      quizState.validationErrors[questionData.question] = "Invalid selection";
      renderQuestion();
      return;
    }
  
    // Save answer
    const existingAnswer = quizState.answers.find(a => a.question === questionData.question);
    if (questionData.is_multiple_choice) {
      if (!existingAnswer) {
        quizState.answers.push({ question: questionData.question, answer: [choice] });
      } else {
        existingAnswer.answer.push(choice);
      }
    } else {
      if (existingAnswer) {
        existingAnswer.answer = choice;
      } else {
        quizState.answers.push({ question: questionData.question, answer: choice });
      }
    }
  
    // Handle follow-ups
    if (questionData.follow_up && questionData.follow_up[choice]) {
      quizState.history.push({ index: quizState.currentQuestionIndex, followUp: quizState.currentFollowUp });
      quizState.currentFollowUp = JSON.parse(JSON.stringify(questionData.follow_up[choice]));
    } else {
      quizState.currentFollowUp = null;
      quizState.currentQuestionIndex++;
    }
  
    // Render next question or results
    if (quizState.currentQuestionIndex < questions.length || quizState.currentFollowUp) {
      renderQuestion();
    } else {
      showResults();
    }
}

// Example validateAnswer function
function validateAnswer(questionData, choice) {
  if (questionData.is_multiple_choice) {
    return questionData.choices.includes(choice);  // Check if choice is valid
  }
  return choice.trim() !== "";  // For non-multiple choice questions, ensure it's not empty
}

  // 3. Add Back Navigation
  function goBack() {
    if (quizState.history.length > 0) {
      const prevState = quizState.history.pop();
      quizState.currentQuestionIndex = prevState.index;
      quizState.currentFollowUp = prevState.followUp;
      renderQuestion();
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
        const fitnessLevelAnswer = rawAnswers.find(a => a.question === "How would you describe your fitness level?")?.answer || "Intermediate";
        
        // Debugging logs
        console.log("Raw Exercise Preference:", rawAnswers.find(a => a.question === "What type of exercise do you prefer?")?.answer);
    
        const transformed = {
            // Map exercise preferences
            workoutPreferences: {
                "Strength training": "Strength training",
                "Cardio": "Cardio",
                "Yoga/Pilates": "Yoga/Pilates",
                "Mixed routine": "Mixed routine"
            }[rawAnswers.find(a => a.question === "What type of exercise do you prefer?")?.answer] || null,
    
            // Map diet preferences
            dietPreferences: rawAnswers.find(a => a.question === "Do you have any dietary restrictions or preferences?")?.answer
            ?.toLowerCase().replace(/-free$/gi, '') || null, // ✅ "Gluten-free" → "gluten"
    
            // Map activity level
            activityLevel: {
                "Beginner": "light",
                "Intermediate": "moderate",
                "Advanced": "active"
            }[fitnessLevelAnswer] || "moderate",
            
            // Explicitly populate fitnessGoals
            fitnessGoals: rawAnswers
                .filter(a => a.question.includes("fitness goals"))
                .map(a => a.answer),
    
            // Medical conditions (limit to 5)
            medicalConditions: rawAnswers
                .find(a => a.question === "Please select any medical conditions you have:")?.answer
                ?.slice(0,5).map(c => c.toLowerCase()) || [],
    
            // Add temporary defaults for required fields
            mealFrequency: "3_meals",
            cookFrequency: "sometimes",
            groceryBudget: "100-150"
        };
    
        // Debugging log after transformation
        console.log("Transformed workoutPreferences:", transformed.workoutPreferences);
        
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

    console.log("Clean Backend Data:", cleanBackendData);
    console.log("Final Data Sent:", finalData);
  
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