# Flappy Bird с фан-ставками 🎮💰

## 📌 Описание проекта

Веб-приложение в стиле **Flappy Bird**, где игроки делают фановые ставки на количество преодолённых препятствий.  
Все ставки и выигрыши ведутся в тестовых/фановых монетах, без реальных транзакций.

Игровой процесс:

1. Пользователь выбирает количество барьеров и сумму ставки.
2. Запускается игровой раунд с анимацией Flappy Bird.
3. Если игрок проходит выбранное количество барьеров — он получает выигрыш с мультипликатором.
4. Если проигрывает — теряет ставку.

## ⚙️ Основные возможности

### Пользовательский функционал

- Регистрация и авторизация.
- Пополнение баланса фановых монет (имитация блокчейн-транзакций).
- Выбор количества препятствий и суммы ставки.
- Игровой раунд с анимацией (**HTML5 Canvas**).
- Отображение результата (пройдено барьеров, выигрыш/проигрыш).
- История игр и транзакций.
- Внутренние переводы фановых монет.

### Админ-панель

- Управление пользователями и их балансом.
- Просмотр всех транзакций.
- Настройка мультипликаторов и модификаторов сложности.
- Контроль логики игры (шанс прохождения, уровни сложности).

## 🧩 Основные сущности

- **User**: `Id, Username, PasswordHash, Balance`
- **GameSession**: `Id, UserId, BarriersToPass, BarriersPassed, BetAmount, Payout, IsCompleted, StartedAt`
- **Transaction**: `Id, UserId, Amount, Type (Deposit, Withdrawal, Bet, Payout), Status, CreatedAt, BlockchainTxHash`

## 🎲 Логика игры

1. Игрок выбирает **BarriersToPass** и **BetAmount**.
2. Система генерирует результат прохождения с учётом случайности и модификаторов.
3. Рассчитывается выигрыш.
4. Баланс пользователя обновляется в базе данных.

## 🛠️ Технологии

| Компонент          | Технология        |
| ------------------ | ----------------- |
| Бэкенд             | ASP.NET Core      |
| API                | Swagger           |
| База данных        | PostgreSQL        |
| Фронтенд           | JavaScript        |
| UI                 | Bootstrap         |
| Анимация игры      | HTML5 Canvas + JS |
| Фановые монеты     | Тестовые токены   |
| Имитация блокчейна | Web3.js           |

## Quick Start

### Prerequisites

- .NET 8.0+
- MongoDB
- MetaMask browser extension

### Setup

```bash
git clone <repository-url>
cd FlappyBird
dotnet restore
dotnet run
```

**Important:** Update the contract address in `Controllers/CryptoController.cs` and `Controllers/BlockchainController.cs` to your own Ethereum address.

Open `http://localhost:5186` in your browser.
