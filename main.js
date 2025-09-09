// Система пользователей (используем память вместо localStorage)
let users = {};
let currentUser = null;

// Игровые переменные
let canvas, ctx;
let gameState = {
    bird: { x: 50, y: 300, velocity: 0, radius: 15 },
    pipes: [],
    score: 0,
    gameRunning: false,
    gameStarted: false,
    targetBarriers: 5,
    betAmount: 5,
    difficulty: 1,
    pipeSpeed: 2,
    pipeGap: 150
};

// Инициализация при загрузке страницы
window.onload = function() {
    init();
};

// Инициализация
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    updateBalance();
    updateBetCalculations();

    // События клавиатуры
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' && gameState.gameRunning) {
            e.preventDefault();
            jump();
        }
    });
    
    // События мыши/тача
    canvas.addEventListener('click', function() {
        if (gameState.gameRunning) {
            jump();
        }
    });

    // Обработчики изменений ставки
    document.getElementById('targetBarriers').addEventListener('input', updateBetCalculations);
    document.getElementById('betAmount').addEventListener('input', updateBetCalculations);
    document.getElementById('difficulty').addEventListener('change', updateBetCalculations);
}

// ===========================================
// СИСТЕМА ПОЛЬЗОВАТЕЛЕЙ
// ===========================================

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Введите имя пользователя и пароль');
        return;
    }

    if (users[username] && users[username].password === password) {
        currentUser = users[username];
        document.getElementById('welcomeText').textContent = `Добро пожаловать, ${username}!`;
        showScreen('menuScreen');
        updateBalance();
    } else {
        alert('Неверные учетные данные');
    }
}

function register() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Введите имя пользователя и пароль');
        return;
    }

    if (users[username]) {
        alert('Пользователь уже существует');
        return;
    }

    users[username] = {
        username: username,
        password: password,
        balance: 100, // Стартовый баланс
        stats: {
            totalGames: 0,
            totalWins: 0,
            totalLosses: 0
        },
        gameHistory: [] // Массив для истории игр
    };

    alert('Регистрация успешна! Теперь войдите в систему.');
}

function logout() {
    currentUser = null;
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showScreen('loginScreen');
    updateBalance();
}

function updateBalance() {
    const balance = currentUser ? currentUser.balance : 0;
    document.getElementById('balanceDisplay').textContent = `$${balance}`;
}

// ===========================================
// НАВИГАЦИЯ ПО ЭКРАНАМ
// ===========================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    // Обновляем данные профиля при переходе на экран профиля
    if (screenId === 'profileScreen') {
        updateProfileData();
    }
}

function showMenu() {
    showScreen('menuScreen');
}

function showBetScreen() {
    if (!currentUser) {
        alert('Войдите в систему');
        return;
    }
    showScreen('betScreen');
    updateBetCalculations();
}

// ===========================================
// СИСТЕМА СТАВОК
// ===========================================

function updateBetCalculations() {
    const targetBarriers = parseInt(document.getElementById('targetBarriers').value);
    const betAmount = parseFloat(document.getElementById('betAmount').value);
    const difficulty = parseFloat(document.getElementById('difficulty').value);
    
    const potentialWin = Math.round(betAmount * difficulty * 100) / 100;
    document.getElementById('potentialWin').textContent = potentialWin;
}

// ===========================================
// ИГРОВАЯ ЛОГИКА
// ===========================================

function startGame() {
    if (!currentUser) {
        alert('Войдите в систему');
        return;
    }

    const betAmount = parseFloat(document.getElementById('betAmount').value);
    const targetBarriers = parseInt(document.getElementById('targetBarriers').value);
    
    // Проверка минимального количества барьеров
    if (targetBarriers < 3) {
        alert('Минимальное количество барьеров: 3');
        return;
    }
    
    if (betAmount > currentUser.balance) {
        alert('Недостаточно средств');
        return;
    }

    // Настройки игры
    gameState.targetBarriers = targetBarriers;
    gameState.betAmount = betAmount;
    gameState.difficulty = parseFloat(document.getElementById('difficulty').value);
    
    // Изменяем сложность игры
    gameState.pipeSpeed = 2 * gameState.difficulty;
    gameState.pipeGap = Math.max(120, 180 - (gameState.difficulty - 1) * 30);

    // Обновляем UI
    document.getElementById('targetDisplay').textContent = gameState.targetBarriers;
    document.getElementById('betDisplay').textContent = gameState.betAmount;
    document.getElementById('scoreDisplay').textContent = '0';

    // Сброс игрового состояния
    gameState.bird = { x: 50, y: 300, velocity: 0, radius: 15 };
    gameState.pipes = [];
    gameState.score = 0;
    gameState.gameRunning = true;
    gameState.gameStarted = true;

    // Скрываем диалог окончания игры
    document.getElementById('gameOverDialog').style.display = 'none';

    // Вычитаем ставку
    currentUser.balance -= gameState.betAmount;
    updateBalance();

    showScreen('gameScreen');
    gameLoop();
}

function jump() {
    if (gameState.gameRunning) {
        gameState.bird.velocity = -8;
    }
}

function gameLoop() {
    if (!gameState.gameRunning) return;

    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Физика птицы
    gameState.bird.velocity += 0.5; // гравитация
    gameState.bird.y += gameState.bird.velocity;

    // Генерация труб
    if (gameState.pipes.length === 0 || gameState.pipes[gameState.pipes.length - 1].x < canvas.width - 200) {
        const pipeHeight = Math.random() * (canvas.height - gameState.pipeGap - 100) + 50;
        gameState.pipes.push({
            x: canvas.width,
            topHeight: pipeHeight,
            bottomHeight: canvas.height - pipeHeight - gameState.pipeGap,
            passed: false
        });
    }

    // Движение труб
    gameState.pipes.forEach((pipe, index) => {
        pipe.x -= gameState.pipeSpeed;

        // Подсчет очков
        if (!pipe.passed && pipe.x + 50 < gameState.bird.x) {
            pipe.passed = true;
            gameState.score++;
            document.getElementById('scoreDisplay').textContent = gameState.score;

            // Проверка победы
            if (gameState.score >= gameState.targetBarriers) {
                endGame(true);
                return;
            }
        }

        // Удаление труб за экраном
        if (pipe.x + 50 < 0) {
            gameState.pipes.splice(index, 1);
        }
    });

    // Проверка столкновений
    if (gameState.bird.y <= 0 || gameState.bird.y >= canvas.height - gameState.bird.radius) {
        endGame(false);
        return;
    }

    gameState.pipes.forEach(pipe => {
        // Столкновение с верхней трубой
        if (gameState.bird.x + gameState.bird.radius > pipe.x && 
            gameState.bird.x - gameState.bird.radius < pipe.x + 50 && 
            gameState.bird.y - gameState.bird.radius < pipe.topHeight) {
            endGame(false);
            return;
        }

        // Столкновение с нижней трубой
        if (gameState.bird.x + gameState.bird.radius > pipe.x && 
            gameState.bird.x - gameState.bird.radius < pipe.x + 50 && 
            gameState.bird.y + gameState.bird.radius > canvas.height - pipe.bottomHeight) {
            endGame(false);
            return;
        }
    });
}

function draw() {
    // Очистка экрана с градиентом
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Рисование труб
    ctx.fillStyle = '#228B22';
    ctx.strokeStyle = '#1F5F1F';
    ctx.lineWidth = 2;
    
    gameState.pipes.forEach(pipe => {
        // Верхняя труба
        ctx.fillRect(pipe.x, 0, 50, pipe.topHeight);
        ctx.strokeRect(pipe.x, 0, 50, pipe.topHeight);
        
        // Нижняя труба
        ctx.fillRect(pipe.x, canvas.height - pipe.bottomHeight, 50, pipe.bottomHeight);
        ctx.strokeRect(pipe.x, canvas.height - pipe.bottomHeight, 50, pipe.bottomHeight);
    });

    // Рисование птицы
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FF8C00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gameState.bird.x, gameState.bird.y, gameState.bird.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Глаз птицы
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(gameState.bird.x + 5, gameState.bird.y - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Клюв птицы
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(gameState.bird.x + gameState.bird.radius, gameState.bird.y);
    ctx.lineTo(gameState.bird.x + gameState.bird.radius + 8, gameState.bird.y - 2);
    ctx.lineTo(gameState.bird.x + gameState.bird.radius + 8, gameState.bird.y + 2);
    ctx.closePath();
    ctx.fill();
}

function endGame(won) {
    gameState.gameRunning = false;
    
    const dialog = document.getElementById('gameOverDialog');
    const title = document.getElementById('gameOverTitle');
    const text = document.getElementById('gameOverText');
    const result = document.getElementById('gameOverResult');

    text.textContent = `Ваш результат: ${gameState.score} из ${gameState.targetBarriers}`;

    if (won) {
        title.textContent = 'Поздравляем! 🎉';
        const winAmount = Math.round(gameState.betAmount * gameState.difficulty * 100) / 100;
        currentUser.balance += winAmount;
        result.textContent = `Вы выиграли $${winAmount}!`;
        result.style.color = '#4CAF50';
    } else {
        title.textContent = 'Попробуйте еще раз! 💪';
        result.textContent = `Вы потеряли $${gameState.betAmount}`;
        result.style.color = '#f44336';
    }

    // Обновляем статистику
    if (!currentUser.stats) {
        currentUser.stats = { totalGames: 0, totalWins: 0, totalLosses: 0 };
    }
    if (!currentUser.gameHistory) {
        currentUser.gameHistory = [];
    }

    currentUser.stats.totalGames++;
    if (won) {
        currentUser.stats.totalWins++;
    } else {
        currentUser.stats.totalLosses++;
    }

    // Добавляем игру в историю
    const winAmount = won ? Math.round(gameState.betAmount * gameState.difficulty * 100) / 100 : 0;
    currentUser.gameHistory.unshift({
        timestamp: Date.now(),
        won: won,
        betAmount: gameState.betAmount,
        winAmount: winAmount,
        score: gameState.score,
        targetBarriers: gameState.targetBarriers,
        difficulty: gameState.difficulty
    });

    updateBalance();
    dialog.style.display = 'block';
}

// ===========================================
// СИСТЕМА ПРОФИЛЯ
// ===========================================

function updateProfileData() {
    if (!currentUser) return;
    
    // Инициализация полей, если их нет
    if (!currentUser.stats) {
        currentUser.stats = { totalGames: 0, totalWins: 0, totalLosses: 0 };
    }
    if (!currentUser.gameHistory) {
        currentUser.gameHistory = [];
    }
    
    // Обновляем основную информацию
    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profileBalance').textContent = `${currentUser.balance}`;
    document.getElementById('totalGames').textContent = currentUser.stats.totalGames;
    document.getElementById('totalWins').textContent = currentUser.stats.totalWins;
    
    // Вычисляем процент побед
    const winRate = currentUser.stats.totalGames > 0 
        ? Math.round((currentUser.stats.totalWins / currentUser.stats.totalGames) * 100)
        : 0;
    document.getElementById('winRate').textContent = `${winRate}%`;
    
    // Обновляем историю игр
    updateGameHistory();
}

function updateGameHistory() {
    const historyList = document.getElementById('historyList');
    const history = currentUser.gameHistory || [];
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">История игр пуста</div>';
        return;
    }
    
    const historyHTML = history.map(game => {
        const resultClass = game.won ? 'win' : 'loss';
        const resultText = game.won ? `Победа (+${game.winAmount})` : `Поражение (-${game.betAmount})`;
        const time = formatTime(game.timestamp);
        const difficultyText = getDifficultyText(game.difficulty);
        
        return `
            <div class="history-item ${resultClass}">
                <div class="history-header">
                    <span class="history-result ${resultClass}">${resultText}</span>
                    <span class="history-time">${time}</span>
                </div>
                <div class="history-details">
                    <span>Ставка: ${game.betAmount}</span>
                    <span class="history-score">${game.score}/${game.targetBarriers}</span>
                    <span>${difficultyText}</span>
                </div>
            </div>
        `;
    }).join('');
    
    historyList.innerHTML = historyHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getDifficultyText(difficulty) {
    switch (difficulty) {
        case 1: return 'Легкая';
        case 1.5: return 'Средняя';
        case 2: return 'Сложная';
        case 2.5: return 'Экстрим';
        default: return 'Неизвестно';
    }
}

function clearHistory() {
    if (!currentUser) return;
    
    if (confirm('Вы уверены, что хотите очистить историю игр?')) {
        currentUser.gameHistory = [];
        currentUser.stats = {
            totalGames: 0,
            totalWins: 0,
            totalLosses: 0
        };
        updateProfileData();
    }
}