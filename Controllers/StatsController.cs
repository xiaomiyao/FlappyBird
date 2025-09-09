using FlappyBird.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System.Security.Claims;

namespace FlappyBird.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StatsController : ControllerBase
    {
        private readonly MongoDbContext _mongo;

        public StatsController(MongoDbContext mongo)
        {
            _mongo = mongo;
        }

        [HttpGet]
        public async Task<IActionResult> GetStats()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userId, out var guid))
                return Unauthorized();

            var filter = Builders<Models.GameSession>.Filter.Eq(s => s.UserId, guid);
            var sessions = await _mongo.GameSessions.Find(filter).ToListAsync();

            int totalGames = sessions.Count;
            int totalWins = sessions.Count(s => s.IsCompleted && s.Payout.HasValue && s.Payout.Value > 0);
            int totalLosses = sessions.Count(s => s.IsCompleted && (!s.Payout.HasValue || s.Payout.Value <= 0));
            decimal totalEarnings = sessions.Where(s => s.Payout.HasValue && s.Payout.Value > 0).Sum(s => s.Payout!.Value);
            decimal totalLossAmount = sessions.Where(s => s.IsCompleted && (!s.Payout.HasValue || s.Payout.Value <= 0)).Sum(s => s.BetAmount);

            double winRate = totalGames > 0 ? (double)totalWins / totalGames * 100 : 0;

            var stats = new
            {
                totalGames,
                totalWins,
                totalLosses,
                winRate = Math.Round(winRate, 2),
                totalEarnings = Math.Round(totalEarnings, 2),
                totalLossAmount = Math.Round(totalLossAmount, 2)
            };

            return Ok(stats);
        }
    }
}