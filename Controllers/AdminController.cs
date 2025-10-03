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
    public class AdminController : ControllerBase
    {
        private readonly MongoDbContext _mongo;

        public AdminController(MongoDbContext mongo)
        {
            _mongo = mongo;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var isAdmin = User.FindFirstValue("role") == "admin";
            if (!isAdmin)
                return Forbid("Admin access required.");

            var skip = (page - 1) * pageSize;

            var users = await _mongo.Users
                .Find(_ => true)
                .Skip(skip)
                .Limit(pageSize)
                .ToListAsync();

            var totalUsers = await _mongo.Users.CountDocumentsAsync(_ => true);

            var userData = users.Select(u => new
            {
                id = u.Id,
                username = u.Username,
                balance = u.Balance,
                gameSessionCount = u.GameSessionIds?.Count ?? 0,
                lastActivity = DateTime.UtcNow
            });

            return Ok(new
            {
                users = userData,
                total = totalUsers,
                page = page,
                pageSize = pageSize,
                totalPages = (int)Math.Ceiling(totalUsers / (double)pageSize)
            });
        }

        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics()
        {
            var isAdmin = User.FindFirstValue("role") == "admin";
            if (!isAdmin)
                return Forbid("Admin access required.");

            var totalUsers = await _mongo.Users.CountDocumentsAsync(_ => true);
            var totalGames = await _mongo.GameSessions.CountDocumentsAsync(_ => true);
            var totalRevenue = await _mongo.GameSessions.Find(_ => true).ToListAsync();
            var revenue = totalRevenue.Where(g => g.IsCompleted && (!g.Payout.HasValue || g.Payout.Value <= 0))
                                    .Sum(g => g.BetAmount);

            var completedGames = await _mongo.GameSessions.CountDocumentsAsync(s => s.IsCompleted);
            var pendingGames = totalGames - completedGames;

            return Ok(new
            {
                totalUsers,
                totalGames,
                totalRevenue = revenue,
                activeUsers = totalUsers, // Placeholder - would need session tracking
                gameStatistics = new
                {
                    completedGames = completedGames,
                    pendingGames = pendingGames
                },
                lastUpdated = DateTime.UtcNow
            });
        }

        [HttpPost("user/{userId}/adjust-balance")]
        public async Task<IActionResult> AdjustUserBalance(Guid userId, [FromBody] BalanceAdjustmentRequest request)
        {
            var isAdmin = User.FindFirstValue("role") == "admin";
            if (!isAdmin)
                return Forbid("Admin access required.");

            var user = await _mongo.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
            if (user == null)
                return NotFound("User not found.");

            var oldBalance = user.Balance;
            user.Balance += request.Amount;

            if (user.Balance < 0)
                return BadRequest("Cannot set negative balance.");

            await _mongo.Users.ReplaceOneAsync(u => u.Id == userId, user);

            return Ok(new
            {
                userId = userId,
                username = user.Username,
                oldBalance = oldBalance,
                newBalance = user.Balance,
                adjustment = request.Amount,
                reason = request.Reason,
                adjustedBy = User.FindFirstValue(ClaimTypes.NameIdentifier),
                timestamp = DateTime.UtcNow
            });
        }
    }

    public class BalanceAdjustmentRequest
    {
        public decimal Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}
