// ========== Глобальні змінні ==========
const TOTAL_WORDS = wordList.length; // 500
let words = wordList;

let wordProgress = [];
let learnedCount = 0;
let activeIndices = [];
let currentWordIndex = null;
let textVisible = true;
let autoSpeak = true;

// DOM елементи
const englishWordSpan = document.getElementById('english-word');
const speakBtn = document.getElementById('speak-btn');
const optionsDiv = document.getElementById('options');
const messageDiv = document.getElementById('message');
const learnedSpan = document.getElementById('learned-count');
const totalSpan = document.getElementById('total-words');
const resetBtn = document.getElementById('reset-btn');
const showTextCheckbox = document.getElementById('show-text');
const autoSpeakCheckbox = document.getElementById('auto-speak');

// ========== Завантаження / збереження ==========
function loadState() {
    const saved = localStorage.getItem('englishGameState');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            wordProgress = state.wordProgress || Array(TOTAL_WORDS).fill(0);
            learnedCount = state.learnedCount || 0;
            activeIndices = state.activeIndices || [];
            textVisible = state.textVisible !== undefined ? state.textVisible : true;
            autoSpeak = state.autoSpeak !== undefined ? state.autoSpeak : true;
            activeIndices = activeIndices.filter(idx => wordProgress[idx] < 5);
            if (activeIndices.length === 0 && learnedCount < TOTAL_WORDS) {
                // Якщо активних немає, але ще не всі вивчені – щось пішло не так, перезапускаємо
                initNewGame();
            } else {
                if (!activeIndices.includes(state.currentWordIndex) && activeIndices.length > 0) {
                    currentWordIndex = activeIndices[0];
                } else {
                    currentWordIndex = state.currentWordIndex;
                }
            }
        } catch (e) {
            initNewGame();
        }
    } else {
        initNewGame();
    }
    showTextCheckbox.checked = textVisible;
    autoSpeakCheckbox.checked = autoSpeak;
    updateTextVisibility();
    updateUI();
}

function saveState() {
    const state = {
        wordProgress,
        learnedCount,
        activeIndices,
        currentWordIndex,
        textVisible,
        autoSpeak
    };
    localStorage.setItem('englishGameState', JSON.stringify(state));
}

function initNewGame() {
    wordProgress = Array(TOTAL_WORDS).fill(0);
    learnedCount = 0;
    const allIndices = [...Array(TOTAL_WORDS).keys()];
    shuffleArray(allIndices);
    activeIndices = allIndices.slice(0, Math.min(10, TOTAL_WORDS));
    currentWordIndex = activeIndices.length > 0 ? activeIndices[0] : null;
    textVisible = true;
    autoSpeak = true;
    showTextCheckbox.checked = true;
    autoSpeakCheckbox.checked = true;
    updateTextVisibility();
    saveState();
}

// ========== Допоміжні функції ==========
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function updateTextVisibility() {
    if (textVisible) {
        englishWordSpan.style.visibility = 'visible';
    } else {
        englishWordSpan.style.visibility = 'hidden';
    }
}

function speakWord(word) {
    if (!word) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
}

function getOptionsForCurrent() {
    if (currentWordIndex === null) return [];
    const correctUa = words[currentWordIndex].ua;
    const otherIndices = [];
    for (let i = 0; i < TOTAL_WORDS; i++) {
        if (i !== currentWordIndex && wordProgress[i] < 5) {
            otherIndices.push(i);
        }
    }
    if (otherIndices.length < 3) {
        for (let i = 0; i < TOTAL_WORDS; i++) {
            if (i !== currentWordIndex && !otherIndices.includes(i)) {
                otherIndices.push(i);
                if (otherIndices.length >= 3) break;
            }
        }
    }
    shuffleArray(otherIndices);
    const randomOthers = otherIndices.slice(0, 3).map(idx => words[idx].ua);
    let opts = [correctUa, ...randomOthers];
    shuffleArray(opts);
    return opts;
}

function renderOptions() {
    if (currentWordIndex === null) {
        optionsDiv.innerHTML = ''; // Очищаємо, бо буде вітання
        return;
    }
    const opts = getOptionsForCurrent();
    optionsDiv.innerHTML = '';
    opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => handleAnswer(opt));
        optionsDiv.appendChild(btn);
    });
}

function handleAnswer(selectedUa) {
    if (currentWordIndex === null) return;
    const correctUa = words[currentWordIndex].ua;
    const isCorrect = (selectedUa === correctUa);
    const buttons = document.querySelectorAll('.option-btn');
    
    // Видаляємо всі попередні класи кольорів
    buttons.forEach(btn => {
        btn.classList.remove('correct', 'wrong');
    });

    // Додаємо клас correct до кнопки з правильною відповіддю
    buttons.forEach(btn => {
        if (btn.textContent === correctUa) {
            btn.classList.add('correct');
        }
    });

    // Якщо відповідь неправильна, додаємо клас wrong до вибраної кнопки
    if (!isCorrect) {
        buttons.forEach(btn => {
            if (btn.textContent === selectedUa) {
                btn.classList.add('wrong');
            }
        });
    }

    // Блокуємо всі кнопки
    buttons.forEach(btn => btn.disabled = true);

    // Логіка прогресу
    if (isCorrect) {
        wordProgress[currentWordIndex] += 1;
        messageDiv.textContent = '✅ Правильно!';
        if (wordProgress[currentWordIndex] === 5) {
            learnedCount++;
            activeIndices = activeIndices.filter(idx => idx !== currentWordIndex);
            const unlearned = [];
            for (let i = 0; i < TOTAL_WORDS; i++) {
                if (wordProgress[i] < 5 && !activeIndices.includes(i)) {
                    unlearned.push(i);
                }
            }
            if (unlearned.length > 0) {
                shuffleArray(unlearned);
                activeIndices.push(unlearned[0]);
            }
        }
    } else {
        wordProgress[currentWordIndex] = 0;
        messageDiv.textContent = '❌ Неправильно. Спробуйте ще раз.';
    }

    learnedCount = wordProgress.filter(v => v >= 5).length;

    if (activeIndices.length > 0) {
        const randomIndex = Math.floor(Math.random() * activeIndices.length);
        currentWordIndex = activeIndices[randomIndex];
    } else {
        currentWordIndex = null;
    }

    saveState();
    
    // Через 1.5 секунди переходимо до наступного слова
    setTimeout(() => {
        updateUI();
    }, 1500);
}

// ========== Функція для показу вітання ==========
function showCongratulations() {
    // Ховаємо англійське слово та кнопку озвучення
    englishWordSpan.textContent = '';
    speakBtn.style.display = 'none';
    
    // Очищаємо варіанти
    optionsDiv.innerHTML = '';
    
    // Показуємо вітальне повідомлення
    optionsDiv.innerHTML = `
        <div class="congrats-message">
            <h2>🎉 Вітаємо! 🎉</h2>
            <p>Ви вивчили всі 500 слів рівня A1!</p>
            <p>Ви молодці! Бажаємо успіхів у подальшому вивченні.</p>
            <button id="play-again-btn" class="btn" style="margin-top: 20px;">Грати знову</button>
        </div>
    `;
    
    // Додаємо обробник для кнопки "Грати знову"
    document.getElementById('play-again-btn').addEventListener('click', () => {
        initNewGame();
        speakBtn.style.display = 'inline-flex'; // повертаємо кнопку
        updateUI();
    });
    
    // Ховаємо повідомлення message (якщо було)
    messageDiv.textContent = '';
}

function updateUI() {
    // Перевіряємо, чи всі слова вивчено
    if (learnedCount === TOTAL_WORDS) {
        showCongratulations();
        return;
    }
    
    // Відновлюємо кнопку озвучення, якщо вона була схована
    speakBtn.style.display = 'inline-flex';
    
    if (currentWordIndex !== null) {
        englishWordSpan.textContent = words[currentWordIndex].en;
        if (autoSpeak) {
            speakWord(words[currentWordIndex].en);
        }
    } else {
        englishWordSpan.textContent = 'Вітаємо!';
    }
    learnedSpan.textContent = learnedCount;
    totalSpan.textContent = TOTAL_WORDS;
    renderOptions();
    updateTextVisibility();
}

// ========== Події ==========
speakBtn.addEventListener('click', () => {
    if (currentWordIndex !== null) {
        speakWord(words[currentWordIndex].en);
    }
});

resetBtn.addEventListener('click', () => {
    initNewGame();
    speakBtn.style.display = 'inline-flex'; // повертаємо кнопку
    updateUI();
});

showTextCheckbox.addEventListener('change', (e) => {
    textVisible = e.target.checked;
    updateTextVisibility();
    saveState();
});

autoSpeakCheckbox.addEventListener('change', (e) => {
    autoSpeak = e.target.checked;
    saveState();
});

// ========== Старт ==========
loadState();