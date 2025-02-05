let answers = []; // Store user answers

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

const quizState = {
    currentQuestionIndex: 0,
    currentFollowUp: null,
    answers: [],
    history: [], // Track user navigation
    validationErrors: {}, // Track validation issues
  };
  
  const questionContainer = document.getElementById("question-container");
  const resultContainer = document.getElementById("result-container");
  const resultSummary = document.getElementById("result-summary");
  
  document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", handleButtonClick);
    renderQuestion();
  });
  
  function handleButtonClick(event) {
    if (event.target.classList.contains("goal-btn")) {
      handleAnswer(event.target.textContent);
    } else if (event.target.classList.contains("back-btn")) {
      goBack();
    }
  }
  
  function renderQuestion() {
    const questionData = quizState.currentFollowUp || questions[quizState.currentQuestionIndex];
    const errorMessage = quizState.validationErrors[questionData.question];
  
    if (!questionContainer) {
      console.error("Error: questionContainer is not defined!");
      return;
    }
  
    questionContainer.innerHTML = `
      <div class="question-content">
        <h2 class="question">${questionData.question}</h2>
        ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
        <div id="goal-buttons" class="goal-buttons">
          ${questionData.choices.map(choice => `<button class="goal-btn">${choice}</button>`).join('')}
        </div>
        ${quizState.history.length > 0 ? `<button class="back-btn">← Back</button>` : ''}
      </div>
    `;
  }
  
  function handleAnswer(choice) {
    const questionData = quizState.currentFollowUp || questions[quizState.currentQuestionIndex];
  
    if (!validateAnswer(questionData, choice)) {
      quizState.validationErrors[questionData.question] = "Invalid selection";
      renderQuestion();
      return;
    }
  
    saveAnswer(questionData, choice);
    navigateToNextQuestionOrFollowUp(questionData, choice);
  }
  
  function saveAnswer(questionData, choice) {
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
  }
  
  function navigateToNextQuestionOrFollowUp(questionData, choice) {
    if (questionData.follow_up && questionData.follow_up[choice]) {
      quizState.history.push({ index: quizState.currentQuestionIndex, followUp: quizState.currentFollowUp });
      quizState.currentFollowUp = { ...questionData.follow_up[choice] }; // Create a shallow copy
    } else {
      quizState.currentFollowUp = null;
      quizState.currentQuestionIndex++;
    }
  
    if (quizState.currentQuestionIndex < questions.length || quizState.currentFollowUp) {
      renderQuestion();
    } else {
      showResults();
    }
  }
  
  function validateAnswer(questionData, choice) {
    if (questionData.question === "Email") {
      return isValidEmail(choice);
    }
    if (questionData.is_multiple_choice) {
      return Array.isArray(questionData.choices) && questionData.choices.includes(choice);
    }
    return true;
  }
  
  function goBack() {
    if (quizState.history.length > 0) {
      const prevState = quizState.history.pop();
      quizState.currentQuestionIndex = prevState.index;
      quizState.currentFollowUp = prevState.followUp;
      renderQuestion();
    }
  }
  
  function showResults() {
    document.querySelector(".question-container").style.display = "none";
  
    const formattedAnswers = quizState.answers
      .map(answer => `${answer.question}: ${Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer}`)
      .join("\n");
  
    resultSummary.textContent = formattedAnswers;
    resultContainer.style.display = "block";
  }
  
  function attachEmailInput() {
    const emailInputContainer = document.querySelector('.email-input-container') || createEmailInputContainer();
    resultContainer.appendChild(emailInputContainer);
  }
  
  function createEmailInputContainer() {
    const emailInputContainer = document.createElement('div');
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
  
    const submitButton = createSubmitButton();
    emailInputContainer.appendChild(submitButton);
  
    return emailInputContainer;
  }
  
  function createSubmitButton() {
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit';
    submitButton.classList.add('submit-btn');
    submitButton.addEventListener('click', finalizeAndSubmit);
    return submitButton;
  }
  
  function finalizeAndSubmit(event) {
    event.preventDefault();
  
    const email = document.getElementById('email')?.value;
    if (!email || !isValidEmail(email)) {
      alert("Please enter a valid email.");
      return;
    }
  
    const finalData = gatherFinalData(email);
    if (Object.values(finalData.newData).some(value => !value)) {
      alert("Please fill in all required fields.");
      return;
    }
  
    submitData(finalData);
  }
  
  function gatherFinalData(email) {
    const fitnessGoals = document.getElementById('fitnessGoals')?.value || "";
    const fitnessGoalDetails = document.getElementById('fitnessGoalDetails')?.value || "";
    const exercisePreference = document.getElementById('exercisePreference')?.value || "";
    const workoutFrequency = document.getElementById('workoutFrequency')?.value || "";
    const fitnessLevel = document.getElementById('fitnessLevel')?.value || "";
    const dietaryPreferences = document.getElementById('dietaryPreferences')?.value || "";
  
    const injuries = getCheckedValues('injuries');
    const injuryDetails = parseJson('injuryDetails');
    const medicalConditions = getCheckedValues('medicalConditions');
    const medicalConditionDetails = parseJson('medicalConditionDetails');
  
    const exerciseEnvironment = document.getElementById('exerciseEnvironment')?.value || "";
    const sleepRecovery = document.getElementById('sleepRecovery')?.value || "";
    const motivationLevel = document.getElementById('motivationLevel')?.value || "";
  
    return {
      email,
      newData: {
        fitnessGoals,
        fitnessGoalDetails,
        exercisePreference,
        workoutFrequency,
        fitnessLevel,
        dietaryPreferences,
        injuries,
        injuryDetails,
        medicalConditions,
        medicalConditionDetails,
        exerciseEnvironment,
        sleepRecovery,
        motivationLevel
      }
    };
  }
  
  function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(checkbox => checkbox.value);
  }
  
  function parseJson(id) {
    try {
      return JSON.parse(document.getElementById(id)?.value || "{}");
    } catch (e) {
      console.warn(`${id} JSON parse error, defaulting to empty object`);
      return {};
    }
  }
  
  function submitData(finalData) {
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
  
  function isValidEmail(email) {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
  }  

renderQuestion();