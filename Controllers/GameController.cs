using FlappyBird.DTOs;
using FlappyBird.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FlappyBird.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GameController : ControllerBase
    {
        private readonly GameService _gameService;

        public GameController(GameService gameService)
        {
            _gameService = gameService;
        }

        [HttpPost("start")]
        [Authorize]
        public async Task<IActionResult> StartGame([FromBody] BetRequest request)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var session = await _gameService.PlaceBetAsync(userId, request.BetAmount, request.TargetBarriers, request.Difficulty);
            if (session == null)
                return BadRequest("Invalid bet or insufficient balance.");

            var user = await _gameService.GetUserByIdAsync(userId);
            return Ok(new
            {
                gameId = session.Id,
                newBalance = user?.Balance ?? 0
            });
        }

        [HttpPost("end")]
        [Authorize]
        public async Task<IActionResult> EndGame([FromBody] GameResultRequest request)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var payout = await _gameService.SubmitResultAsync(userId, request.GameId, request.Score, request.Won);
            if (payout == null)
                return BadRequest("Invalid game or already submitted.");

            var user = await _gameService.GetUserByIdAsync(userId);
            return Ok(new
            {
                winAmount = payout ?? 0,
                newBalance = user?.Balance ?? 0,
                message = payout > 0 ? "You won!" : "You lost."
            });
        }

        [HttpPost("bet")]
        [Authorize]
        public async Task<IActionResult> PlaceBet([FromBody] BetRequest request)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var session = await _gameService.PlaceBetAsync(userId, request.BetAmount, request.TargetBarriers, request.Difficulty);
            if (session == null)
                return BadRequest("Invalid bet or insufficient balance.");

            return Ok(new { gameId = session.Id });
        }

        [HttpPost("result")]
        [Authorize]
        public async Task<IActionResult> SubmitResult([FromBody] GameResultRequest request)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var payout = await _gameService.SubmitResultAsync(userId, request.GameId, request.Score, request.Won);
            if (payout == null)
                return BadRequest("Invalid game or already submitted.");

            return Ok(new
            {
                payout,
                message = payout > 0 ? "You won!" : "You lost."
            });
        }

        [HttpGet("balance")]
        [Authorize]
        public async Task<IActionResult> GetBalance()
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var user = await _gameService.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound("User not found.");

            return Ok(new { balance = user.Balance });
        }







    }
}