const questions = [
    {
        question: "What are your primary fitness goals?",
        choices: ["Weight loss", "Muscle gain", "Improved endurance", "Flexibility", "Overall health and wellness", "Improved mental health", "Injury rehabilitation", "Athletic performance"],
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
            "Injury rehabilitation": {
                question: "What injury are you rehabilitating?",
                choices: ["Back injury", "Knee injury", "Shoulder injury", "Ankle injury"]
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

// Your questions array remains unchanged

let currentQuestionIndex = 0;
let currentFollowUp = null;
const answers = [];

function renderQuestion() {
    const questionContainer = document.getElementById('question-container');

    // Get the current question data
    const questionData = currentFollowUp || questions[currentQuestionIndex];

    // Check if there are no more questions to show
    if (!questionData) {
        console.error("No question data available!");
        return;
    }

    // Fade out current content
    questionContainer.classList.remove('fade-in');
    questionContainer.classList.add('fade-out');

    setTimeout(() => {
        // Insert new content
        questionContainer.innerHTML = `
            <div class="question-content">
                <h2 class="question">${questionData.question}</h2>
                <div class="goal-buttons">
                    ${questionData.choices
                        .map(
                            (choice) =>
                                `<button class="goal-btn" onclick="handleAnswer('${choice}')">${choice}</button>`
                        )
                        .join("")}
                </div>
            </div>
        `;

        // Reapply the fade-in class
        questionContainer.classList.remove('fade-out');
        questionContainer.classList.add('fade-in');

        // Center the content
        const questionContent = questionContainer.querySelector('.question-content');
        questionContent.style.display = 'flex';
        questionContent.style.flexDirection = 'column';
        questionContent.style.alignItems = 'center';

        // Style buttons in grid
        const goalButtonsContainer = questionContent.querySelector('.goal-buttons');
        goalButtonsContainer.style.display = 'grid';
        goalButtonsContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
        goalButtonsContainer.style.gap = '20px';
        goalButtonsContainer.style.justifyItems = 'center';
    }, 500);
}

function handleAnswer(choice) {
    const questionData = currentFollowUp || questions[currentQuestionIndex];

    // Ensure questionData is valid
    if (!questionData) {
        console.error("No question data available!");
        return; // Prevent further execution
    }

    // Store the answer in the answers array
    if (questionData.is_multiple_choice) {
        if (!answers.some(a => a.question === questionData.question)) {
            answers.push({ question: questionData.question, answer: [] });
        }
        answers.find(a => a.question === questionData.question).answer.push(choice);
    } else {
        answers.push({ question: questionData.question, answer: choice });
    }

    // Check for follow-up questions
    if (questionData.follow_up && questionData.follow_up[choice]) {
        // Set the follow-up question
        currentFollowUp = questionData.follow_up[choice];
    } else {
        // No follow-up, move to the next main question
        currentFollowUp = null;
        currentQuestionIndex++;
    }

    // Check if we have more questions to show or if the quiz is finished
    if (currentQuestionIndex < questions.length || currentFollowUp) {
        renderQuestion();
    } else {
        // Quiz finished, display results or perform final action
        showResults();
    }
}

function showResults() {
    const resultContainer = document.getElementById("result-container");
    const resultSummary = document.getElementById("result-summary");

    // Hide quiz elements
    document.querySelector(".question-container").style.display = "none";

    // Format the answers and display them
    const formattedAnswers = answers
        .map(answer => `${answer.question}: ${answer.answer}`)
        .join("\n");

    resultSummary.textContent = formattedAnswers;

    // Show results container
    resultContainer.style.display = "block";
}

// Initialize quiz by rendering the first question
renderQuestion();