using FlappyBird.Models;
using FlappyBird.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;

namespace FlappyBird.Services
{
    public class AuthService
    {
        private readonly MongoDbContext _mongo;
        private readonly IConfiguration _config;

        public AuthService(MongoDbContext mongo, IConfiguration config)
        {
            _mongo = mongo;
            _config = config;
        }

        public async Task<(bool Success, string Message)> RegisterAsync(string username, string password)
        {
            var existing = await _mongo.Users.Find(u => u.Username == username).FirstOrDefaultAsync();
            if (existing != null)
                return (false, "Username already exists.");

            var hashed = BCrypt.Net.BCrypt.HashPassword(password);
            var user = new User
            {
                Username = username,
                PasswordHash = hashed,
                Balance = 1000
            };

            await _mongo.Users.InsertOneAsync(user);
            return (true, "");
        }

        public async Task<(bool Success, string Message, string? Token, decimal? Balance)> LoginAsync(string username, string password)
        {
            var user = await _mongo.Users.Find(u => u.Username == username).FirstOrDefaultAsync();
            if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                return (false, "Invalid credentials.", null, null);

            var token = GenerateJwtToken(user);
            return (true, "", token, user.Balance);
        }

        public Task<bool> VerifyTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key,
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                return Task.FromResult(true);
            }
            catch
            {
                return Task.FromResult(false);
            }
        }

        public async Task<User?> GetUserByIdAsync(Guid userId)
        {
            return await _mongo.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
