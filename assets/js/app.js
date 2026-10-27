// Quiz Master Pro - Application Logic

// Global variables
let currentTheme = 'light';
let currentQuiz = {};
let currentQuestionIndex = 0;
let score = 0;
let correctAnswers = 0;
let wrongAnswers = 0;
let currentStreak = 0;
let maxStreak = 0;
let timer = null;
let timeLeft = 30; // Per question timer
let gameTimer = null; // For Time Rush mode
let gameTimeLeft = 90; // 90 seconds for time rush
let fiftyFiftyUsed = false;
let selectedDifficulty = 'easy';
let selectedGameMode = 'classic';
let selectedQuestionType = 'multiple';

let userStats = {
    totalGames: 0,
    bestScore: 0,
    totalCorrect: 0,
    categoryStats: {}
};

const categories = [
    { id: 9, key: 'general', title: 'General Knowledge', icon: 'fa-brain', desc: 'Test your knowledge across various topics' },
    { id: 17, key: 'science', title: 'Science & Nature', icon: 'fa-flask', desc: 'Explore the mysteries of our universe' },
    { id: 21, key: 'sports', title: 'Sports', icon: 'fa-futbol', desc: 'Athletic achievements and records' },
    { id: 23, key: 'history', title: 'History', icon: 'fa-landmark', desc: 'Journey through time and civilizations' },
    { id: 11, key: 'movies', title: 'Movies & TV', icon: 'fa-film', desc: 'Cinema magic and entertainment' },
    { id: 12, key: 'music', title: 'Music', icon: 'fa-music', desc: 'Rhythms, melodies, and artists' },
    { id: 18, key: 'computers', title: 'Technology', icon: 'fa-laptop-code', desc: 'Digital world and innovations' },
    { id: 25, key: 'art', title: 'Art & Literature', icon: 'fa-palette', desc: 'Creative expressions and masterpieces' }
];

// Initialize particles and UI on page load
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    loadUserData();
    populateCategories();
    updateStats();
});

// Create floating particles
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
        particlesContainer.appendChild(particle);
    }
}

function populateCategories() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    grid.innerHTML = '';
    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => startQuiz(cat.id, cat.key);
        card.innerHTML = `
            <div class="category-icon"><i class="fas ${cat.icon}"></i></div>
            <div class="category-title">${cat.title}</div>
            <div class="category-desc">${cat.desc}</div>
            <div class="category-stats" id="${cat.key}-stats">No games played yet</div>
        `;
        grid.appendChild(card);
            if (!userStats.categoryStats[cat.key]) {
            userStats.categoryStats[cat.key] = { gamesPlayed: 0, bestScore: 0, totalCorrect: 0 };
        }
    });
}

// Toggle theme with enhanced animation
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.className = currentTheme + '-theme';
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    document.body.style.transform = 'scale(0.98)';
    setTimeout(() => { document.body.style.transform = 'scale(1)'; }, 200);
    
    saveUserData();
}

function selectOption(type, value, element) {
    if (type === 'difficulty') {
        selectedDifficulty = value;
    } else if (type === 'gamemode') {
        selectedGameMode = value;
    }
    
    const parent = element.parentElement;
    parent.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
}

// Decode HTML entities
function decodeHtml(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

// Start the quiz with enhanced loading
async function startQuiz(categoryId, categoryKey) {
    document.getElementById('homepage').classList.add('hidden');
    document.getElementById('quizpage').classList.remove('hidden');
    document.getElementById('quizpage').classList.add('fade-in');
    document.getElementById('loadingMessage').classList.remove('hidden');
    document.getElementById('quizContent').classList.add('hidden');
    
    // Reset quiz state
    currentQuiz.category = categoryKey;
    currentQuestionIndex = 0;
    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    currentStreak = 0;
    maxStreak = 0;
    fiftyFiftyUsed = false;
    
    const fiftyBtn = document.getElementById('fiftyFiftyBtn');
    if (fiftyBtn) {
        fiftyBtn.disabled = false;
        fiftyBtn.style.display = (selectedGameMode === 'classic') ? 'flex' : 'none';
    }
    
    let amount = (selectedGameMode === 'time-rush' || selectedGameMode === 'sudden-death') ? 50 : 10;

    try {
        const apiUrl = `https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&difficulty=${selectedDifficulty}&type=multiple`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.response_code !== 0) throw new Error('API returned no questions.');

        currentQuiz.questions = data.results.map(q => {
            const options = shuffleArray([...q.incorrect_answers.map(decodeHtml), decodeHtml(q.correct_answer)]);
            return {
                question: decodeHtml(q.question),
                options: options,
                correct: options.indexOf(decodeHtml(q.correct_answer))
            };
        });
        
    } catch (error) {
        console.error("Failed to fetch questions:", error);
        showNotification('Failed to load questions. Please try again.', 'error');
        goHome();
        return;
    }
    
    currentQuiz.totalQuestions = currentQuiz.questions.length;
    
    setTimeout(() => {
        document.getElementById('loadingMessage').classList.add('hidden');
        document.getElementById('quizContent').classList.remove('hidden');
        document.getElementById('quizContent').classList.add('fade-in');
        
        if(selectedGameMode === 'time-rush') {
            startGameTimer();
        }

        loadQuestion();
    }, 1500);
}

// Shuffle array utility
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Load question with enhanced animations
function loadQuestion() {
    clearConfetti();

    if (currentQuestionIndex >= currentQuiz.totalQuestions) {
        endQuiz(true); // Quiz finished normally
        return;
    }

    const question = currentQuiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / currentQuiz.totalQuestions) * 100;
    
    const currentQEl = document.getElementById('currentQuestion');
    if (currentQEl) {
        currentQEl.textContent = `${currentQuestionIndex + 1}`;
        if(selectedGameMode === 'classic') {
                currentQEl.textContent += ` of ${currentQuiz.totalQuestions}`;
        }
    }

    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = (selectedGameMode === 'classic') ? progress + '%' : '0%';
    }
    
    document.getElementById('questionText').textContent = question.question;
    document.getElementById('currentScore').textContent = score;
    document.getElementById('correctCount').textContent = correctAnswers;
    document.getElementById('streak').textContent = currentStreak;

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        optionElement.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
        optionElement.onclick = () => selectAnswer(index);
        optionElement.style.animationDelay = `${index * 0.1}s`;
        optionElement.classList.add('slide-in');
        optionsContainer.appendChild(optionElement);
    });
    
    if(selectedGameMode !== 'time-rush') {
            startTimer();
    }
}

function startGameTimer() {
    gameTimeLeft = 90;
    updateGameTimerDisplay();

    gameTimer = setInterval(() => {
        gameTimeLeft--;
        updateGameTimerDisplay();

        if (gameTimeLeft <= 0) {
            clearInterval(gameTimer);
            endQuiz(true); // Time's up
        }
    }, 1000);
}

function updateGameTimerDisplay() {
    const timerCircle = document.getElementById('timerCircle');
    timerCircle.textContent = gameTimeLeft;
    const percentage = (gameTimeLeft / 90) * 360;
    let color = gameTimeLeft <= 10 ? 'var(--danger-color)' : gameTimeLeft <= 30 ? 'var(--warning-color)' : 'var(--primary-color)';
    if (gameTimeLeft <= 10) timerCircle.classList.add('pulse');
    else timerCircle.classList.remove('pulse');
    timerCircle.style.background = `conic-gradient(${color} ${percentage}deg, rgba(102, 126, 234, 0.2) ${percentage}deg)`;
}

// Enhanced timer with visual improvements
function startTimer() {
    timeLeft = 30;
    updateTimerDisplay();

    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timer);
            selectAnswer(-1); // Time ran out for this question
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerCircle = document.getElementById('timerCircle');
    timerCircle.textContent = timeLeft;
    const percentage = (timeLeft / 30) * 360;
    let color = timeLeft <= 5 ? 'var(--danger-color)' : timeLeft <= 10 ? 'var(--warning-color)' : 'var(--primary-color)';
    if (timeLeft <= 5) timerCircle.classList.add('pulse');
    else timerCircle.classList.remove('pulse');
    timerCircle.style.background = `conic-gradient(${color} ${percentage}deg, rgba(102, 126, 234, 0.2) ${percentage}deg)`;
}

// Enhanced 50:50 lifeline
function useFiftyFifty() {
    if (fiftyFiftyUsed) return;
    fiftyFiftyUsed = true;
    document.getElementById('fiftyFiftyBtn').disabled = true;
    
    const question = currentQuiz.questions[currentQuestionIndex];
    const options = Array.from(document.querySelectorAll('.option'));
    const correctIndex = question.correct;
    
    let incorrectIndices = [];
    options.forEach((opt, i) => {
        if (i !== correctIndex) incorrectIndices.push(i);
    });
    
    const shuffled = shuffleArray(incorrectIndices);
    
    options[shuffled[0]].style.opacity = '0.3';
    options[shuffled[0]].style.pointerEvents = 'none';
    options[shuffled[1]].style.opacity = '0.3';
    options[shuffled[1]].style.pointerEvents = 'none';

    showNotification('Two incorrect answers removed!', 'success');
}

// Enhanced answer selection with better feedback
function selectAnswer(selectedIndex) {
    clearInterval(timer);
    const question = currentQuiz.questions[currentQuestionIndex];
    const options = document.querySelectorAll('.option');
    const isCorrect = selectedIndex === question.correct;

    options.forEach(option => option.style.pointerEvents = 'none');
    
    if (isCorrect) {
        options[selectedIndex].classList.add('correct');
    } else {
        if(selectedIndex !== -1) options[selectedIndex].classList.add('incorrect');
        options[question.correct].classList.add('correct');
    }
    
    let timeout = 2500;
    if (isCorrect) {
        correctAnswers++;
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
        
        const timeBonus = selectedGameMode !== 'time-rush' ? Math.floor(timeLeft / 2) : 10;
        const streakBonus = currentStreak >= 3 ? currentStreak * 10 : 0;
        score += 100 + timeBonus + streakBonus;
        
        showFeedback(true, timeBonus, streakBonus);
        createConfetti();
    } else {
        wrongAnswers++;
        currentStreak = 0;
        showFeedback(false);
        if (selectedGameMode === 'sudden-death') {
            timeout = 3000;
            setTimeout(() => endQuiz(true), timeout);
            return;
        }
    }

    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, timeout);
}

// Enhanced feedback system
function showFeedback(isCorrect, timeBonus = 0, streakBonus = 0) {
    const feedbackElement = document.createElement('div');
    feedbackElement.className = isCorrect ? 'feedback-popup correct-popup' : 'feedback-popup incorrect-popup';
    
    let bonusText = '';
    if (isCorrect) {
        if(timeBonus > 0) bonusText += `+${timeBonus} time bonus! `;
        if(streakBonus > 0) bonusText += `+${streakBonus} streak bonus!`;
    }

    feedbackElement.innerHTML = `
        <div class="feedback-icon">${isCorrect ? '✓' : '✗'}</div>
        <div class="feedback-text">${isCorrect ? 'Correct!' : 'Wrong!'}</div>
        <div class="feedback-bonus">${bonusText}</div>
    `;
    
    document.body.appendChild(feedbackElement);
    setTimeout(() => {
        if(document.body.contains(feedbackElement)) document.body.removeChild(feedbackElement);
    }, 2500);
}

// Enhanced confetti system
function createConfetti() {
    const celebration = document.getElementById('celebration');
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 90%, 70%)`;
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.setProperty('--x', Math.random() * 200 - 100 + 'px');
        confetti.style.setProperty('--rot', Math.random() * 720 - 360 + 'deg');
        celebration.appendChild(confetti);
    }
    setTimeout(clearConfetti, 4000);
}

function clearConfetti() {
    const cel = document.getElementById('celebration');
    if (cel) cel.innerHTML = '';
}

// Enhanced quiz ending
function endQuiz(finished) {
    clearInterval(timer);
    clearInterval(gameTimer);
    clearConfetti();
    
    // Update statistics
    userStats.totalGames++;
    userStats.totalCorrect += correctAnswers;
    if (score > userStats.bestScore) userStats.bestScore = score;
    
    const categoryStats = userStats.categoryStats[currentQuiz.category];
    if (categoryStats) {
        categoryStats.gamesPlayed++;
        categoryStats.totalCorrect += correctAnswers;
        if (score > categoryStats.bestScore) categoryStats.bestScore = score;
    }

    saveUserData();

    document.getElementById('quizpage').classList.add('hidden');
    document.getElementById('resultpage').classList.remove('hidden');
    document.getElementById('resultpage').classList.add('fade-in');

    // Generate dynamic result stats based on game mode
    const resultStatsContainer = document.getElementById('resultStats');
    resultStatsContainer.innerHTML = ''; // Clear previous stats

    let statsHtml = '';
    if (selectedGameMode === 'classic') {
        const accuracy = Math.round((correctAnswers / (correctAnswers + wrongAnswers)) * 100) || 0;
            statsHtml = `
            <div class="stat-card"><div class="stat-value">${score}</div><div class="stat-label">Final Score</div></div>
            <div class="stat-card"><div class="stat-value">${correctAnswers}</div><div class="stat-label">Correct</div></div>
            <div class="stat-card"><div class="stat-value">${wrongAnswers}</div><div class="stat-label">Wrong</div></div>
            <div class="stat-card"><div class="stat-value">${accuracy}%</div><div class="stat-label">Accuracy</div></div>`;
    } else if (selectedGameMode === 'time-rush') {
        statsHtml = `
            <div class="stat-card"><div class="stat-value">${score}</div><div class="stat-label">Final Score</div></div>
            <div class="stat-card"><div class="stat-value">${correctAnswers}</div><div class="stat-label">Answered</div></div>
            <div class="stat-card"><div class="stat-value">${maxStreak}</div><div class="stat-label">Best Streak</div></div>`;
    } else if (selectedGameMode === 'sudden-death') {
        statsHtml = `
            <div class="stat-card"><div class="stat-value">${score}</div><div class="stat-label">Final Score</div></div>
            <div class="stat-card"><div class="stat-value">${correctAnswers}</div><div class="stat-label">Final Streak</div></div>`;
    }
    resultStatsContainer.innerHTML = statsHtml;
    
    let message = '';
    if (finished) {
        if (correctAnswers > wrongAnswers) {
            message = '🌟 Excellent work! You really know your stuff!';
            if(correctAnswers / (correctAnswers + wrongAnswers) > 0.9) {
                message = '🏆 Amazing! You are a true quiz master!';
                createCelebrationEffect();
            }
        } else {
            message = '👏 Good effort! Keep practicing to improve!';
        }
    } else {
            message = '💪 Every expert was once a beginner. Try again!';
    }
    document.getElementById('performanceMessage').textContent = message;
}

function createCelebrationEffect() {
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 90%, 70%)`;
        confetti.style.animationDuration = Math.random() * 2 + 3 + 's';
        confetti.style.setProperty('--x', Math.random() * 200 - 100 + 'px');
        confetti.style.setProperty('--rot', Math.random() * 720 - 360 + 'deg');
        document.getElementById('celebration').appendChild(confetti);
    }
}

function restartQuiz() {
    clearConfetti();
    startQuiz(categories.find(c => c.key === currentQuiz.category).id, currentQuiz.category);
}

function goHome() {
    clearConfetti();
    document.getElementById('resultpage').classList.add('hidden');
    document.getElementById('quizpage').classList.add('hidden');
    document.getElementById('homepage').classList.remove('hidden');
    document.getElementById('homepage').classList.add('fade-in');
    updateStats();
}

function updateStats() {
    Object.keys(userStats.categoryStats).forEach(cat => {
        const stats = userStats.categoryStats[cat];
        const statsElement = document.getElementById(`${cat}-stats`);
        if (statsElement) {
            if (stats.gamesPlayed === 0) {
                statsElement.textContent = 'No games played yet';
            } else {
                statsElement.textContent = `${stats.gamesPlayed} games • Best: ${stats.bestScore}`;
            }
        }
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
     // Re-implementing the style from observation as it was truncated in view, 
     // but I can infer a nice style or simple one.
     // To be safe and "High Quality", I'll give it a nice style.
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff4d4d' : '#4facfe'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => { if (document.body.contains(notification)) document.body.removeChild(notification); }, 3000);
}

function saveUserData() {
    try {
        localStorage.setItem('quizMasterProData', JSON.stringify({ userStats, currentTheme }));
    } catch (error) {
        console.warn('Could not save user data:', error);
    }
}

function loadUserData() {
    try {
        const savedData = JSON.parse(localStorage.getItem('quizMasterProData'));
        if (savedData) {
            userStats = savedData.userStats || userStats;
            if (savedData.currentTheme) {
                currentTheme = savedData.currentTheme;
                document.body.className = currentTheme + '-theme';
                const themeIcon = document.getElementById('themeIcon');
                if (themeIcon) {
                    themeIcon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
                }
            }
        }
    } catch (error) {
        console.warn('Could not load user data:', error);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
    }
    
    // Check if quiz content is currently visible
    const quizContent = document.getElementById('quizContent');
    const quizContentVisible = quizContent && !quizContent.classList.contains('hidden');
    
    if (quizContentVisible) {
        if (e.key >= '1' && e.key <= '4') {
            const options = document.querySelectorAll('.option');
            if(options[e.key - 1]) options[e.key-1].click();
        } else if (e.key === ' ' || e.key.toLowerCase() === 'f') {
                e.preventDefault();
                if (!fiftyFiftyUsed && selectedGameMode === 'classic') useFiftyFifty();
        }
    }
});

console.log('Quiz Master Pro initialized with new features!');
