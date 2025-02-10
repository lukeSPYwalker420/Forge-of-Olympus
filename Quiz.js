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
            "Overall health and wellness": {
                question: "Are there any specific health conditions you're managing?",
                choices: ["Yes", "No", "Prefer not to say"]
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

console.log(quizState.fitnessGoal);

const questionContainer = document.getElementById("question-container");

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
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
    const button = event.target.closest("[data-choice]");
    if (!button) return;

    const choice = button.dataset.choice;
    console.log("handleAnswer triggered for:", choice);
    const questionData = quizState.currentFollowUp || questions[quizState.currentQuestionIndex];

    if (!questionData) return;

    // Store the selected fitness goal if it's the primary question
    if (questionData.question === "What are your primary fitness goals?") {
        console.log("Storing fitnessGoal:", choice);
        quizState.fitnessGoal = choice;
    } 

    // Store fitnessGoalDetails if this is a follow-up to the primary fitness goal
    if (questionData.follow_up) {
        const fitnessGoalDetails = quizState.fitnessGoalDetails || {};
        fitnessGoalDetails[quizState.fitnessGoal] = fitnessGoalDetails[quizState.fitnessGoal] || {};
        
        if (!fitnessGoalDetails[quizState.fitnessGoal][questionData.question]) {
            fitnessGoalDetails[quizState.fitnessGoal][questionData.question] = choice;
        } else {
            fitnessGoalDetails[quizState.fitnessGoal][questionData.question] = choice;
        }

        quizState.fitnessGoalDetails = fitnessGoalDetails;
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

    // Handle follow-up questions based on the selected answer
    if (questionData.follow_up && questionData.follow_up[choice]) {
        quizState.history.push({ index: quizState.currentQuestionIndex, followUp: quizState.currentFollowUp });
        quizState.currentFollowUp = JSON.parse(JSON.stringify(questionData.follow_up[choice]));
        quizState.currentQuestionIndex = 0;  // Reset to first question in the follow-up
    } else {
        quizState.currentFollowUp = null;
        quizState.currentQuestionIndex++;
    }

    // Render the next question or show results if the quiz is complete
    if (quizState.currentQuestionIndex < questions.length || quizState.currentFollowUp) {
        renderQuestion();
    } else {
        showResults();
    }
}

// --- Show Results ---
function showResults() {
    const resultContainer = document.getElementById("result-container");
    const resultSummary = document.getElementById("result-summary");
    document.querySelector(".question-container").style.display = "none";

    const fitnessGoal = quizState.fitnessGoal || "Not specified"; // Default if goal is not selected
    const formattedAnswers = quizState.answers
        .map(answer => `${answer.question}: ${Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer}`)
        .join("\n");

    resultSummary.textContent = `Fitness Goal: ${fitnessGoal}\n${formattedAnswers}`;
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
    const exercisePreference = getAnswerFor("What type of exercise do you prefer?");
    const workoutFrequency = getAnswerFor("How many days a week are you able to commit to working out?");
    const fitnessLevel = getAnswerFor("What is your current fitness level?");
    const dietaryPreferences = getAnswerFor("Do you have any dietary restrictions or preferences?");

    // Validate that required answers are present
    if (!fitnessGoals || !exercisePreference || !workoutFrequency || !fitnessLevel || !dietaryPreferences) {
        alert("Please fill in all required fields.");
        return;
    }

    // Get the fitnessGoalDetails dynamically based on the primary fitness goal choice
    let fitnessGoalDetails = "";
    if (fitnessGoals === "Muscle gain") {
        fitnessGoalDetails = getAnswerFor("How much muscle are you looking to gain?");
    } else if (fitnessGoals === "Weight loss") {
        fitnessGoalDetails = getAnswerFor("How much weight are you looking to lose?");
    } else if (fitnessGoals === "Improved endurance") {
        fitnessGoalDetails = getAnswerFor("How much endurance are you looking to improve?");
    } else if (fitnessGoals === "Athletic performance") {
        fitnessGoalDetails = getAnswerFor("What type of athletic performance are you aiming for?");
    } else if (fitnessGoals === "Overall health and wellness") {
        fitnessGoalDetails = getAnswerFor("What aspect of health and wellness are you focusing on?");
    }

    // If fitnessGoalDetails is required for the selected goal, validate it
    if (!fitnessGoalDetails) {
        alert("Please provide details for your fitness goal.");
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
    // In finalizeAndSubmit function:
const finalData = {
    email: email,
    newData: {
        // Primary fitness goal (required by backend)
        fitnessGoal: quizState.fitnessGoal, // This comes from the first question
        
        // Follow-up details for the specific goal
        fitnessGoalDetails: getAnswerFor(
            questions[0].follow_up[quizState.fitnessGoal].question
        ),
        
        // Rest of the data
        exercisePreference: getAnswerFor("What type of exercise do you prefer?"),
        workoutFrequency: getAnswerFor("How many days a week are you able to commit to working out?"),
        fitnessLevel: getAnswerFor("What is your current fitness level?"),
        dietaryPreferences: getAnswerFor("Do you have any dietary restrictions or preferences?"),
    
        injuries: {
            hasInjuries: getAnswerFor("Do you have any injuries...") === "Yes",
            details: getAnswerFor("Please select any injuries...", true) || []
          },
          medicalConditions: {
            hasConditions: getAnswerFor("Do you have any medical conditions...") === "Yes",
            conditions: getAnswerFor("Please select any medical conditions...", true) || []
          },
        exerciseEnvironment: getAnswerFor("What is your preferred exercise environment?"),
        sleepRecovery: getAnswerFor("How well do you manage sleep and recovery?"),
        motivationLevel: getAnswerFor("How motivated are you to achieve your fitness goals?")
    }
};

    // Corrected console log using 'email' and 'finalData.newData'
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