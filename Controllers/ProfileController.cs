using FlappyBird.Data;
using FlappyBird.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System.Security.Claims;

namespace FlappyBird.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly MongoDbContext _mongo;

        public ProfileController(MongoDbContext mongo)
        {
            _mongo = mongo;
        }

        // GET /api/profile
        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userId, out var guid))
                return Unauthorized();

            var user = await _mongo.Users.Find(u => u.Id == guid).FirstOrDefaultAsync();
            if (user == null)
                return NotFound("User not found.");

            var sessions = await _mongo.GameSessions.Find(s => s.UserId == guid).ToListAsync();

            var totalGames = sessions.Count;
            var totalWins = sessions.Count(s => s.Payout.HasValue && s.Payout > 0);
            var totalLosses = totalGames - totalWins;
            var totalEarnings = sessions.Sum(s => s.Payout ?? 0);
            var totalLostCoins = sessions.Sum(s => s.Payout.HasValue && s.Payout > 0 ? 0 : s.BetAmount);
            var winRate = totalGames == 0 ? 0 : Math.Round((decimal)totalWins / totalGames * 100, 2);

            return Ok(new
            {
                user.Username,
                user.Balance,
                totalGames,
                totalWins,
                totalLosses,
                winRate,
                totalEarnings,
                totalLostCoins
            });
        }

        // POST /api/profile
        [HttpPost]
        public async Task<IActionResult> UpdateProfile([FromBody] ProfileUpdateRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userId, out var guid))
                return Unauthorized();

            var update = Builders<User>.Update.Set(u => u.Username, request.Username);
            var result = await _mongo.Users.UpdateOneAsync(u => u.Id == guid, update);

            if (result.MatchedCount == 0)
                return NotFound("User not found.");

            return Ok("Profile updated.");
        }
    }

    public class ProfileUpdateRequest
    {
        public string Username { get; set; } = string.Empty;
    }
}
