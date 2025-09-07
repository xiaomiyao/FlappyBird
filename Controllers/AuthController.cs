using FlappyBird.DTOs;
using FlappyBird.Models;
using FlappyBird.Services;
using Microsoft.AspNetCore.Mvc;

namespace FlappyBird.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
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
                balance = result.Balance
            });
        }
    }
}