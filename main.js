// ===========================================
// КОНФИГУРАЦИЯ API
// ===========================================
const API_BASE_URL = 'http://localhost:5186'; // Backend API URL
let authToken = null;

// ===========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ API
// ===========================================

async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const options = {
        method,
        headers
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        // Check if response has content
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        
        if (!response.ok) {
            throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        if (error instanceof SyntaxError) {
            throw new Error('Сервер вернул некорректный ответ');
        }
        throw error;
    }
}

// ===========================================
// ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
// ===========================================
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
    pipeGap: 150,
    gameId: null
};

const TESTNET_CHAIN_ID = '0xaa36a7'; // Sepolia testnet

// ===========================================
// METAMASK ФУНКЦИИ
// ===========================================

async function checkMetaMask() {
    if (typeof window.ethereum === 'undefined') {
        alert('Пожалуйста, установите MetaMask');
        return false;
    }
    
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== TESTNET_CHAIN_ID) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: TESTNET_CHAIN_ID }],
            });
        }
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        return accounts[0];
    } catch (error) {
        console.error('MetaMask error:', error);
        alert('Ошибка подключения к MetaMask');
        return false;
    }
}

async function getContractAddress() {
    try {
        const data = await apiRequest('/api/blockchain/contract-address');
        return data.address;
    } catch (error) {
        console.error('Error getting contract address:', error);
        return '0x742d35Cc6CF38c5d35E5E6B4f7C4E6A6E3f7f6B'; // Fallback адрес из бэкенда
    }
}

async function depositWithMetaMask() {
    const account = await checkMetaMask();
    if (!account) return;
    
    const amount = document.getElementById('cryptoAmount').value;
    if (!amount || parseFloat(amount) <= 0) {
        alert('Введите корректную сумму');
        return;
    }
    
    const amountWei = '0x' + (parseFloat(amount) * 1e18).toString(16);
    
    try {
        // Получаем адрес контракта с сервера
        const contractAddress = await getContractAddress();
        
        // Инициируем депозит на сервере (бэк не ожидает walletAddress)
        const initData = await apiRequest('/api/crypto/deposit/initiate', 'POST', {
            amount: parseFloat(amount)
        });
        
        // Отправляем транзакцию через MetaMask
        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
                from: account,
                to: contractAddress,
                value: amountWei
            }],
        });
        
        alert('Транзакция отправлена! Ожидайте подтверждения...');
        
        // Подтверждаем депозит на сервере
        const confirmData = await apiRequest('/api/crypto/deposit/confirm', 'POST', {
            depositId: initData.depositId,
            amount: parseFloat(amount),
            transactionHash: txHash
        });
        
        // Обновляем баланс из ответа сервера
        await updateBalance();
        await loadTransactionHistory();
        
        alert('Депозит успешно выполнен!');
    } catch (error) {
        console.error('Deposit error:', error);
        alert(`Ошибка при выполнении депозита: ${error.message}`);
    }
}

async function withdrawWithMetaMask() {
    const account = await checkMetaMask();
    if (!account) return;
    
    const amount = document.getElementById('cryptoAmount').value;
    if (!amount || parseFloat(amount) <= 0) {
        alert('Введите корректную сумму');
        return;
    }
    
    try {
        // Получаем курс обмена
        const rateData = await apiRequest('/api/crypto/exchange-rate');
        const gameTokens = parseFloat(amount) * rateData.ethToGameCurrency; // Бэк возвращает ethToGameCurrency
        
        if (gameTokens > currentUser.balance) {
            alert('Недостаточно средств');
            return;
        }
        
        // Запрашиваем вывод
        const withdrawData = await apiRequest('/api/crypto/withdraw/request', 'POST', {
            amount: parseFloat(amount),
            ethereumAddress: account // Бэк ожидает ethereumAddress
        });
        
        // Обновляем баланс
        await updateBalance();
        await loadTransactionHistory();
        
        alert(`Запрос на вывод создан! ID: ${withdrawData.withdrawalId}\nСтатус можно отследить в истории транзакций`);
    } catch (error) {
        console.error('Withdrawal error:', error);
        alert(`Ошибка при выводе средств: ${error.message}`);
    }
}

// ===========================================
// ИНИЦИАЛИЗАЦИЯ
// ===========================================

window.onload = function() {
    init();
    checkAuthToken();
};

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    updateBalance();
    updateBetCalculations();

    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' && gameState.gameRunning) {
            e.preventDefault();
            jump();
        }
    });
    
    canvas.addEventListener('click', function() {
        if (gameState.gameRunning) {
            jump();
        }
    });

    document.getElementById('targetBarriers').addEventListener('input', updateBetCalculations);
    document.getElementById('betAmount').addEventListener('input', updateBetCalculations);
    document.getElementById('difficulty').addEventListener('change', updateBetCalculations);
}

function checkAuthToken() {
    authToken = localStorage.getItem('authToken');
    if (authToken) {
        verifyToken();
    }
}

async function verifyToken() {
    try {
        const data = await apiRequest('/api/auth/verify');
        currentUser = data.user;
        document.getElementById('welcomeText').textContent = `Добро пожаловать, ${currentUser.username}!`;
        showScreen('menuScreen');
        updateBalance();
    } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('authToken');
        authToken = null;
    }
}

// ===========================================
// АУТЕНТИФИКАЦИЯ
// ===========================================

async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Введите имя пользователя и пароль');
        return;
    }

    try {
        const data = await apiRequest('/api/auth/login', 'POST', {
            username,
            password
        });
        
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        currentUser = data.user;
        
        document.getElementById('welcomeText').textContent = `Добро пожаловать, ${username}!`;
        showScreen('menuScreen');
        updateBalance();
    } catch (error) {
        alert(`Ошибка входа: ${error.message}`);
    }
}

async function register() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Введите имя пользователя и пароль');
        return;
    }

    try {
        await apiRequest('/api/auth/register', 'POST', {
            username: username,
            password: password
        });
        
        alert('Регистрация успешна! Теперь войдите в систему.');
        showScreen('loginScreen');
    } catch (error) {
        console.error('Registration error:', error);
        alert(`Ошибка регистрации: ${error.message}`);
    }
}

async function logout() {
    try {
        await apiRequest('/api/auth/logout', 'POST');
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showScreen('loginScreen');
    updateBalance();
}

async function updateBalance() {
    const balanceElement = document.getElementById('balanceDisplay');
    
    if (!currentUser) {
        balanceElement.textContent = '$0';
        return;
    }
    
    try {
        const data = await apiRequest('/api/game/balance');
        currentUser.balance = data.balance;
        balanceElement.textContent = `$${data.balance.toFixed(2)}`;
    } catch (error) {
        console.error('Error updating balance:', error);
        balanceElement.textContent = `$${currentUser.balance.toFixed(2)}`;
    }
}

// ===========================================
// НАВИГАЦИЯ
// ===========================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    if (screenId === 'profileScreen') {
        setTimeout(() => {
            updateProfileData();
        }, 300);
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
// СТАВКИ
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

async function startGame() {
    if (!currentUser) {
        alert('Войдите в систему');
        return;
    }

    const betAmount = parseFloat(document.getElementById('betAmount').value);
    const targetBarriers = parseInt(document.getElementById('targetBarriers').value);
    
    if (targetBarriers < 3) {
        alert('Минимальное количество барьеров: 3');
        return;
    }
    
    if (betAmount > currentUser.balance) {
        alert('Недостаточно средств');
        return;
    }

    try {
        // Начинаем игру через API
        const data = await apiRequest('/api/game/start', 'POST', {
            betAmount,
            targetBarriers,
            difficulty: parseFloat(document.getElementById('difficulty').value)
        });
        
        gameState.gameId = data.gameId;
        gameState.targetBarriers = targetBarriers;
        gameState.betAmount = betAmount;
        gameState.difficulty = parseFloat(document.getElementById('difficulty').value);
        
        gameState.pipeSpeed = 2 * gameState.difficulty;
        gameState.pipeGap = Math.max(120, 180 - (gameState.difficulty - 1) * 30);

        document.getElementById('targetDisplay').textContent = gameState.targetBarriers;
        document.getElementById('betDisplay').textContent = gameState.betAmount;
        document.getElementById('scoreDisplay').textContent = '0';

        gameState.bird = { x: 50, y: 300, velocity: 0, radius: 15 };
        gameState.pipes = [];
        gameState.score = 0;
        gameState.gameRunning = true;
        gameState.gameStarted = true;

        document.getElementById('gameOverDialog').style.display = 'none';

        currentUser.balance = data.newBalance;
        updateBalance();

        showScreen('gameScreen');
        gameLoop();
    } catch (error) {
        alert(`Ошибка начала игры: ${error.message}`);
    }
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
    gameState.bird.velocity += 0.5;
    gameState.bird.y += gameState.bird.velocity;

    if (gameState.pipes.length === 0 || gameState.pipes[gameState.pipes.length - 1].x < canvas.width - 200) {
        const pipeHeight = Math.random() * (canvas.height - gameState.pipeGap - 100) + 50;
        gameState.pipes.push({
            x: canvas.width,
            topHeight: pipeHeight,
            bottomHeight: canvas.height - pipeHeight - gameState.pipeGap,
            passed: false
        });
    }

    gameState.pipes.forEach((pipe, index) => {
        pipe.x -= gameState.pipeSpeed;

        if (!pipe.passed && pipe.x + 50 < gameState.bird.x) {
            pipe.passed = true;
            gameState.score++;
            document.getElementById('scoreDisplay').textContent = gameState.score;

            if (gameState.score >= gameState.targetBarriers) {
                endGame(true);
                return;
            }
        }

        if (pipe.x + 50 < 0) {
            gameState.pipes.splice(index, 1);
        }
    });

    if (gameState.bird.y <= 0 || gameState.bird.y >= canvas.height - gameState.bird.radius) {
        endGame(false);
        return;
    }

    gameState.pipes.forEach(pipe => {
        if (gameState.bird.x + gameState.bird.radius > pipe.x && 
            gameState.bird.x - gameState.bird.radius < pipe.x + 50 && 
            gameState.bird.y - gameState.bird.radius < pipe.topHeight) {
            endGame(false);
            return;
        }

        if (gameState.bird.x + gameState.bird.radius > pipe.x && 
            gameState.bird.x - gameState.bird.radius < pipe.x + 50 && 
            gameState.bird.y + gameState.bird.radius > canvas.height - pipe.bottomHeight) {
            endGame(false);
            return;
        }
    });
}

function draw() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#228B22';
    ctx.strokeStyle = '#1F5F1F';
    ctx.lineWidth = 2;
    
    gameState.pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, 50, pipe.topHeight);
        ctx.strokeRect(pipe.x, 0, 50, pipe.topHeight);
        
        ctx.fillRect(pipe.x, canvas.height - pipe.bottomHeight, 50, pipe.bottomHeight);
        ctx.strokeRect(pipe.x, canvas.height - pipe.bottomHeight, 50, pipe.bottomHeight);
    });

    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FF8C00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gameState.bird.x, gameState.bird.y, gameState.bird.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(gameState.bird.x + 5, gameState.bird.y - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(gameState.bird.x + gameState.bird.radius, gameState.bird.y);
    ctx.lineTo(gameState.bird.x + gameState.bird.radius + 8, gameState.bird.y - 2);
    ctx.lineTo(gameState.bird.x + gameState.bird.radius + 8, gameState.bird.y + 2);
    ctx.closePath();
    ctx.fill();
}

async function endGame(won) {
    gameState.gameRunning = false;
    
    try {
        // Отправляем результат игры на сервер
        const data = await apiRequest('/api/game/end', 'POST', {
            gameId: gameState.gameId,
            won,
            score: gameState.score,
            targetBarriers: gameState.targetBarriers
        });
        
        const dialog = document.getElementById('gameOverDialog');
        const title = document.getElementById('gameOverTitle');
        const text = document.getElementById('gameOverText');
        const result = document.getElementById('gameOverResult');

        text.textContent = `Ваш результат: ${gameState.score} из ${gameState.targetBarriers}`;

        if (won) {
            title.textContent = 'Поздравляем! 🎉';
            result.textContent = `Вы выиграли $${data.winAmount.toFixed(2)}!`;
            result.style.color = '#4CAF50';
        } else {
            title.textContent = 'Попробуйте еще раз! 💪';
            result.textContent = `Вы потеряли $${gameState.betAmount}`;
            result.style.color = '#f44336';
        }

        currentUser.balance = data.newBalance;
        updateBalance();
        dialog.style.display = 'block';
    } catch (error) {
        console.error('Error ending game:', error);
        alert(`Ошибка завершения игры: ${error.message}`);
    }
}

// ===========================================
// ПРОФИЛЬ
// ===========================================

async function updateProfileData() {
    if (!currentUser) return;
    
    try {
        // Загружаем данные профиля
        const profileData = await apiRequest('/api/profile/profile');
        const statsData = await apiRequest('/api/stats');
        
        document.getElementById('profileUsername').textContent = profileData.username;
        document.getElementById('profileBalance').textContent = profileData.balance.toFixed(2);
        document.getElementById('totalGames').textContent = statsData.totalGames;
        document.getElementById('totalWins').textContent = statsData.totalWins;
        
        const winRate = statsData.totalGames > 0 
            ? Math.round((statsData.totalWins / statsData.totalGames) * 100)
            : 0;
        document.getElementById('winRate').textContent = `${winRate}%`;
        
        const gamesHistory = document.getElementById('gamesHistory');
        if (gamesHistory) {
            gamesHistory.classList.add('active');
        }
        
        setTimeout(() => {
            loadGameHistory();
            loadTransactionHistory();
        }, 100);
    } catch (error) {
        console.error('Error updating profile:', error);
    }
}

async function loadGameHistory() {
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryUpdate = async () => {
        const historyList = document.getElementById('gameHistoryList');
        
        if (!historyList && attempts < maxAttempts) {
            attempts++;
            setTimeout(tryUpdate, 100);
            return;
        }
        
        if (!historyList) {
            console.error('Элемент gameHistoryList не найден');
            return;
        }
        
        try {
            const data = await apiRequest('/api/history');
            
            if (!data.games || data.games.length === 0) {
                historyList.innerHTML = '<div class="history-empty">История игр пуста</div>';
                return;
            }

            const historyHTML = data.games.map(game => `
                <div class="history-item ${game.won ? 'win' : 'loss'}">
                    <div class="history-info">
                        <div class="history-result">${game.won ? 'Победа' : 'Поражение'}</div>
                        <div class="history-time">${formatTime(new Date(game.timestamp).getTime())}</div>
                    </div>
                    <div class="history-details">
                        <div class="history-bet">Ставка: ${game.betAmount}</div>
                        <div class="history-win">Выигрыш: ${game.winAmount}</div>
                        <div class="history-score">Счёт: ${game.score}/${game.targetBarriers}</div>
                        <div class="history-difficulty">Сложность: ${getDifficultyText(game.difficulty)}</div>
                    </div>
                </div>
            `).join('');
            
            historyList.innerHTML = historyHTML;
        } catch (error) {
            console.error('Error loading game history:', error);
            historyList.innerHTML = '<div class="history-empty">Ошибка загрузки истории</div>';
        }
    };
    
    tryUpdate();
}

async function loadTransactionHistory() {
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryUpdate = async () => {
        const historyList = document.getElementById('transactionHistoryList');
        
        if (!historyList && attempts < maxAttempts) {
            attempts++;
            setTimeout(tryUpdate, 100);
            return;
        }
        
        if (!historyList) {
            console.error('Элемент transactionHistoryList не найден');
            return;
        }
        
        try {
            const transactions = await apiRequest('/api/crypto/transactions');
            
            // Бэк возвращает массив напрямую, не обернутый в объект
            if (!transactions || transactions.length === 0) {
                historyList.innerHTML = '<div class="history-empty">История транзакций пуста</div>';
                return;
            }

            historyList.innerHTML = transactions.map(tx => `
                <div class="transaction-item ${tx.type}">
                    <div class="transaction-info">
                        <div class="transaction-type">
                            ${tx.type === 'deposit' ? 'Пополнение' : 'Вывод'}
                        </div>
                        <div class="transaction-date">
                            ${new Date(tx.timestamp).toLocaleString('ru-RU')}
                        </div>
                    </div>
                    <div class="transaction-amount">
                        ${tx.type === 'deposit' ? '+' : '-'}${tx.amount} ETH
                    </div>
                    <div class="transaction-status ${tx.status}">
                        ${tx.status === 'completed' ? 'Завершено' : 
                          tx.status === 'pending' ? 'В обработке' : tx.status}
                    </div>
                    ${tx.transactionHash ? `
                        <div class="transaction-hash" title="${tx.transactionHash}">
                            TX: ${tx.transactionHash.substring(0, 10)}...
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading transaction history:', error);
            historyList.innerHTML = '<div class="history-empty">Ошибка загрузки истории</div>';
        }
    };
    
    tryUpdate();
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

async function clearHistory() {
    if (!currentUser) return;
    
    if (confirm('Вы уверены, что хотите очистить историю игр?')) {
        try {
            await apiRequest('/api/history', 'DELETE');
            await loadGameHistory();
            await updateProfileData();
            alert('История игр очищена');
        } catch (error) {
            alert(`Ошибка очистки истории: ${error.message}`);
        }
    }
}

async function clearTransactionHistory() {
    if (!currentUser) return;
    
    if (confirm('Вы уверены, что хотите очистить историю транзакций?')) {
        try {
            await apiRequest('/api/crypto/transactions', 'DELETE');
            await loadTransactionHistory();
            alert('История транзакций очищена');
        } catch (error) {
            alert(`Ошибка очистки истории: ${error.message}`);
        }
    }
}

function switchHistoryTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const buttons = document.querySelectorAll('.tab-btn');
    if (tab === 'games') {
        buttons[0].classList.add('active');
    } else {
        buttons[1].classList.add('active');
    }

    document.querySelectorAll('.history-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tab === 'games') {
        const gamesHistory = document.getElementById('gamesHistory');
        if (gamesHistory) {
            gamesHistory.classList.add('active');
        }
        setTimeout(loadGameHistory, 50);
    } else {
        const transactionsHistory = document.getElementById('transactionsHistory');
        if (transactionsHistory) {
            transactionsHistory.classList.add('active');
        }
        setTimeout(loadTransactionHistory, 50);
    }
}