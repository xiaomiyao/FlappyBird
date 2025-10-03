using FlappyBird.Data;
using FlappyBird.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System.Security.Claims;
using FlappyBird.DTOs;

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

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userId, out var guid))
                return Unauthorized();

            var user = await _mongo.Users.Find(u => u.Id == guid).FirstOrDefaultAsync();
            if (user == null)
                return NotFound(new { message = "User not found." });

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                balance = user.Balance,
                gameSessionCount = user.GameSessionIds?.Count ?? 0
            });
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateUsernameRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.NewUsername))
                return BadRequest(new { message = "Username cannot be empty." });

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userId, out var guid))
                return Unauthorized();

            var user = await _mongo.Users.Find(u => u.Id == guid).FirstOrDefaultAsync();
            if (user == null)
                return NotFound(new { message = "User not found." });

            user.Username = request.NewUsername;
            await _mongo.Users.ReplaceOneAsync(u => u.Id == guid, user);

            return Ok(new { message = "Profile updated", username = user.Username });
        }
    }
}