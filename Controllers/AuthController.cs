using FlappyBird.DTOs;
using FlappyBird.Models;
using FlappyBird.Services;
using Microsoft.AspNetCore.Mvc;

namespace FlappyBird.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] AuthRequest request)
        {
            var result = await _authService.RegisterAsync(request.Username, request.Password);
            if (!result.Success)
                return BadRequest(result.Message);

            return Ok(new { message = "Registered successfully." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AuthRequest request)
        {
            var result = await _authService.LoginAsync(request.Username, request.Password);
            if (!result.Success)
                return Unauthorized(result.Message);

            return Ok(new
            {
                token = result.Token,
                user = new { username = request.Username, balance = result.Balance }
            });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            return Ok(new { message = "Logged out successfully." });
        }

        [HttpGet("verify")]
        public async Task<IActionResult> Verify()
        {
            var token = Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();
            if (string.IsNullOrEmpty(token))
                return Unauthorized("No token provided.");

            var isValid = await _authService.VerifyTokenAsync(token);
            if (!isValid)
                return Unauthorized("Invalid token.");

            // Get user data from token
            var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var jsonToken = tokenHandler.ReadJwtToken(token);
            var userIdClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier);
            var usernameClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Name);

            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized("Invalid token claims.");

            // Get user from database
            var user = await _authService.GetUserByIdAsync(userId);
            if (user == null)
                return Unauthorized("User not found.");

            return Ok(new { user = new { id = user.Id, username = user.Username, balance = user.Balance } });
        }
    }
}