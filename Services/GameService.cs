using FlappyBird.Data;
using FlappyBird.Helpers;
using FlappyBird.Models;
using MongoDB.Driver;

namespace FlappyBird.Services
{
    public class GameService
    {
        private readonly MongoDbContext _mongo;

        public GameService(MongoDbContext mongo)
        {
            _mongo = mongo;
        }

        public async Task<GameSession?> PlaceBetAsync(Guid userId, decimal betAmount, int targetBarriers, string difficulty)
        {
            if (betAmount < 1 || targetBarriers < 3 || targetBarriers > 20)
                return null;

            if (!Enum.TryParse<DifficultyLevel>(difficulty, true, out var parsedDifficulty))
                return null;

            var user = await _mongo.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
            if (user == null || user.Balance < betAmount)
                return null;

            user.Balance -= betAmount;
            await _mongo.Users.ReplaceOneAsync(u => u.Id == userId, user);

            var session = new GameSession
            {
                UserId = userId,
                BetAmount = betAmount,
                BarriersToPass = targetBarriers,
                Difficulty = parsedDifficulty.ToString()
            };

            await _mongo.GameSessions.InsertOneAsync(session);
            return session;
        }

        public async Task<decimal?> SubmitResultAsync(Guid userId, Guid gameId, int score, bool won)
        {
            var session = await _mongo.GameSessions.Find(s => s.Id == gameId && s.UserId == userId).FirstOrDefaultAsync();
            if (session == null || session.IsCompleted)
                return null;

            var user = await _mongo.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
            if (user == null)
                return null;

            session.BarriersPassed = score;
            session.IsCompleted = true;

            decimal payout = 0;

            if (score >= session.BarriersToPass && won)
            {
                Enum.TryParse<DifficultyLevel>(session.Difficulty, out var level);
                var multiplier = MultiplierHelper.GetMultiplier(level);
                payout = session.BetAmount * multiplier;

                user.Balance += payout;
                session.Payout = payout;

                await _mongo.Users.ReplaceOneAsync(u => u.Id == userId, user);
            }

            await _mongo.GameSessions.ReplaceOneAsync(s => s.Id == gameId, session);
            return payout;
        }

        public async Task<User?> GetUserByIdAsync(Guid userId)
        {
            return await _mongo.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        }



    }
}