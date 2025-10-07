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
    public class HistoryController : ControllerBase
    {
        private readonly MongoDbContext _mongo;

        public HistoryController(MongoDbContext mongo)
        {
            _mongo = mongo;
        }

        // GET /api/history?pageLimit=10&recordsToSkip=0&sortOrder=desc
        [HttpGet]
        public async Task<IActionResult> GetHistory(
            [FromQuery(Name = "pageLimit")] int pageLimit = 10,
            [FromQuery(Name = "recordsToSkip")] int recordsToSkip = 0,
            [FromQuery(Name = "sortOrder")] string sortOrder = "desc")
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userId, out var guid))
                return Unauthorized();

            var sortDef = sortOrder.ToLower() == "asc"
                ? Builders<GameSession>.Sort.Ascending(s => s.StartedAt)
                : Builders<GameSession>.Sort.Descending(s => s.StartedAt);

            var history = await _mongo.GameSessions
                .Find(s => s.UserId == guid)
                .Sort(sortDef)
                .Skip(recordsToSkip)
                .Limit(pageLimit)
                .ToListAsync();

            return Ok(new { games = history });
        }

        // DELETE /api/history
        [HttpDelete]
        public async Task<IActionResult> ClearHistory()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userId, out var guid))
                return Unauthorized();

            var result = await _mongo.GameSessions.DeleteManyAsync(s => s.UserId == guid);

            return Ok(new { deleted = result.DeletedCount });
        }
    }
}
