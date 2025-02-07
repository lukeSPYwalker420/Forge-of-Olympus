// --- Quiz Data ---
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
                choices: ["Yes", "No", "Prefer not to say"]
            },
            "Improved mental health": {
                question: "What mental health improvements are you aiming for?",
                choices: ["Reduced stress", "Improved focus", "Better sleep", "Increased mood"]
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

// --- Quiz State ---
let currentQuestionIndex = 0;
let currentFollowUp = null;

const quizState = {
    currentQuestionIndex: 0,
    currentFollowUp: null,
    answers: [],
    history: [],
    validationErrors: {}
};

const questionContainer = document.getElementById("question-container");

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    // Use event delegation on the body
    document.body.addEventListener("click", (event) => {
        if (event.target.classList.contains("goal-btn")) {
            handleAnswer(event);
        } else if (event.target.classList.contains("back-btn")) {
            goBack();
        }
    });

    renderQuestion();
});

// --- Render Question ---
function renderQuestion() {
    if (!questionContainer) {
        console.error("Error: questionContainer is not defined!");
        return;
    }
    const questionData = quizState.currentFollowUp || questions[quizState.currentQuestionIndex];
    if (!questionData) {
        console.error("Error: No question data found for index:", quizState.currentQuestionIndex);
        return;
    }
    const errorMessage = quizState.validationErrors[questionData.question];
    questionContainer.innerHTML = `
      <div class="question-content">
        <h2 class="question">${questionData.question}</h2>
        ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
        <div id="goal-buttons" class="goal-buttons">
          ${questionData.choices?.map(choice => `
            <button class="goal-btn" data-choice="${choice}">${choice}</button>
          `).join('') || ''}
        </div>
        ${quizState.history.length > 0 ? `<button class="back-btn">← Back</button>` : ''}
      </div>
    `;
}

// --- Handle Answer ---
function handleAnswer(event) {
    // Get the button element that was clicked (or its closest parent with data-choice)
    const button = event.target.closest("[data-choice]");
    if (!button) {
        console.error("Error: Clicked element has no data-choice", event.target);
        return;
    }
    const choice = button.dataset.choice;
    const questionData = quizState.currentFollowUp || questions[quizState.currentQuestionIndex];
    if (!questionData) {
        console.error("Error: questionData is undefined");
        return;
    }
    if (!validateAnswer(questionData, choice)) {
        quizState.validationErrors[questionData.question] = "Invalid selection";
        renderQuestion();
        return;
    }
    let existingAnswer = quizState.answers.find(a => a.question === questionData.question);
    if (questionData.is_multiple_choice) {
        if (!existingAnswer) {
            quizState.answers.push({ question: questionData.question, answer: [choice] });
        } else if (!existingAnswer.answer.includes(choice)) {
            existingAnswer.answer.push(choice);
        }
    } else {
        if (existingAnswer) {
            existingAnswer.answer = choice;
        } else {
            quizState.answers.push({ question: questionData.question, answer: choice });
        }
    }
    // Handle follow-up questions
    if (questionData.follow_up && questionData.follow_up[choice]) {
        quizState.history.push({ index: quizState.currentQuestionIndex, followUp: quizState.currentFollowUp });
        quizState.currentFollowUp = JSON.parse(JSON.stringify(questionData.follow_up[choice]));
    } else {
        quizState.currentFollowUp = null;
        quizState.currentQuestionIndex++;
    }
    if (quizState.currentQuestionIndex < questions.length || quizState.currentFollowUp) {
        renderQuestion();
    } else {
        // Quiz is complete; show results (static HTML already has the email input & submit button)
        showResults();
    }
}

// --- Validate Answer ---
function validateAnswer(questionData, choice) {
    if (questionData.question === "Email") {
        return typeof choice === "string" && isValidEmail(choice);
    }
    if (questionData.is_multiple_choice) {
        return Array.isArray(questionData.choices) &&
               questionData.choices.some(c => c === choice || c.value === choice);
    }
    return true;
}

// --- Back Navigation ---
function goBack() {
    if (quizState.history.length > 0) {
        const prevState = quizState.history.pop();
        quizState.currentQuestionIndex = prevState.index;
        quizState.currentFollowUp = prevState.followUp;
        renderQuestion();
    }
}

// --- Show Results ---
function showResults() {
    const resultContainer = document.getElementById("result-container");
    const resultSummary = document.getElementById("result-summary");
    document.querySelector(".question-container").style.display = "none";
    const formattedAnswers = quizState.answers
        .map(answer => `${answer.question}: ${Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer}`)
        .join("\n");
    resultSummary.textContent = formattedAnswers;
    resultContainer.style.display = "block";
}

function getAnswerFor(questionText, asArray = false) {
    const answerObj = quizState.answers.find(a => a.question === questionText);
    if (!answerObj) return asArray ? [] : "";
    if (Array.isArray(answerObj.answer)) {
        return asArray ? answerObj.answer : answerObj.answer.join(", ");
    } else {
        return asArray ? [answerObj.answer] : answerObj.answer;
    }
}

// --- Finalize and Submit ---
function finalizeAndSubmit(event) {
    if (event && event.preventDefault) {
        event.preventDefault();
    }
    
    // Get the email input from the static form element
    const email = document.getElementById('email')?.value;
    if (!email || !isValidEmail(email)) {
        alert("Please enter a valid email.");
        return;
    }
    
    // Build final data using quizState.answers via the helper function
    const fitnessGoals = getAnswerFor("What are your primary fitness goals?");
    const fitnessGoalDetails = getAnswerFor("How much muscle are you looking to gain?");
    const exercisePreference = getAnswerFor("What type of exercise do you prefer?");
    const workoutFrequency = getAnswerFor("How many days a week are you able to commit to working out?");
    const fitnessLevel = getAnswerFor("What is your current fitness level?");
    const dietaryPreferences = getAnswerFor("Do you have any dietary restrictions or preferences?");
    
    // Validate that required answers are present
    if (!fitnessGoals || !exercisePreference || !workoutFrequency || !fitnessLevel || !dietaryPreferences) {
        alert("Please fill in all required fields.");
        return;
    }
    
    // For fields that the server expects as arrays, use the asArray flag
    const injuries = getAnswerFor("Do you have any injuries that need to be considered when planning your exercises?", true);
    const medicalConditions = getAnswerFor("Do you have any medical conditions that may affect your ability to exercise?", true);
    
    // For the remaining fields, assume string output
    const exerciseEnvironment = getAnswerFor("What is your preferred exercise environment?");
    const sleepRecovery = getAnswerFor("How well do you manage sleep and recovery?");
    const motivationLevel = getAnswerFor("How motivated are you to achieve your fitness goals?");
    
    // Build the finalData object
    const finalData = {
        email: email,
        newData: {
            fitnessGoals: fitnessGoals,
            fitnessGoalDetails: fitnessGoalDetails,
            exercisePreference: exercisePreference,
            workoutFrequency: workoutFrequency,
            fitnessLevel: fitnessLevel,
            dietaryPreferences: dietaryPreferences,
            injuries: injuries, // This will be an array (or empty array)
            medicalConditions: medicalConditions, // This will be an array, as required by the server
            exerciseEnvironment: exerciseEnvironment,
            sleepRecovery: sleepRecovery,
            motivationLevel: motivationLevel
        }
    };
    
    console.log("Final Data Sent:", finalData);
    
    fetch('https://forge-of-olympus.onrender.com/api/user/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

// --- Submit Button Listener ---
document.getElementById('submit-btn').addEventListener('click', function(event) {
    console.log('Submit button clicked');
    finalizeAndSubmit(event);
});

function isValidEmail(email) {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
}

renderQuestion();
