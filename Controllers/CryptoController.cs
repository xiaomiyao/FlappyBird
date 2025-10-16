using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FlappyBird.Data;
using FlappyBird.Models;
using MongoDB.Driver;

namespace FlappyBird.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CryptoController : ControllerBase
    {
        private readonly MongoDbContext _mongo;

        public CryptoController(MongoDbContext mongo)
        {
            _mongo = mongo;
        }

        [HttpPost("deposit/initiate")]
        public Task<IActionResult> InitiateDeposit([FromBody] DepositRequest request)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            // Placeholder implementation
            var depositId = Guid.NewGuid();

            return Task.FromResult<IActionResult>(Ok(new
            {
                depositId = depositId,
                address = "0xBE40374353462eC233F4B6AD14E86197fF600Ee6", // Contract address
                amount = request.Amount,
                message = "Deposit initiated. Send ETH to the address above."
            }));
        }

        [HttpPost("deposit/confirm")]
        public async Task<IActionResult> ConfirmDeposit([FromBody] ConfirmDepositRequest request)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            try
            {
                // Get exchange rate to convert ETH to game currency
                var ethToGameCurrency = 10000.00m; // 1 ETH = 10,000 game currency units
                var gameCurrencyAmount = request.Amount * ethToGameCurrency;

                // Update user balance
                var user = await _mongo.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null)
                    return NotFound("User not found.");

                user.Balance += gameCurrencyAmount;
                await _mongo.Users.ReplaceOneAsync(u => u.Id == userId, user);

                return Ok(new
                {
                    depositId = request.DepositId,
                    status = "confirmed",
                    amount = request.Amount,
                    gameCurrencyAmount = gameCurrencyAmount,
                    newBalance = user.Balance,
                    message = "Deposit confirmed and balance updated."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error confirming deposit: {ex.Message}" });
            }
        }

        [HttpPost("withdraw/request")]
        public Task<IActionResult> RequestWithdraw([FromBody] WithdrawRequest request)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var withdrawalId = Guid.NewGuid();

            return Task.FromResult<IActionResult>(Ok(new
            {
                withdrawalId = withdrawalId,
                status = "pending",
                amount = request.Amount,
                address = request.EthereumAddress,
                message = "Withdrawal request submitted and pending processing."
            }));
        }

        [HttpGet("withdraw/status/{withdrawalId}")]
        public Task<IActionResult> GetWithdrawStatus(Guid withdrawalId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            return Task.FromResult<IActionResult>(Ok(new
            {
                withdrawalId = withdrawalId,
                status = "completed",
                amount = 0.1m,
                transactionHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
            }));
        }

        [HttpGet("transactions")]
        public Task<IActionResult> GetTransactions()
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var transactions = new[]
            {
                new
                {
                    id = Guid.NewGuid(),
                    type = "deposit",
                    amount = 0.1m,
                    status = "completed",
                    timestamp = DateTime.UtcNow.AddDays(-1),
                    transactionHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
                },
                new
                {
                    id = Guid.NewGuid(),
                    type = "withdrawal",
                    amount = 0.05m,
                    status = "pending",
                    timestamp = DateTime.UtcNow.AddHours(-2),
                    transactionHash = (string?)null
                }
            };

            return Task.FromResult<IActionResult>(Ok(transactions));
        }

        [HttpDelete("transactions")]
        public Task<IActionResult> ClearTransactions()
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            return Task.FromResult<IActionResult>(Ok(new { message = "Transaction history cleared." }));
        }

        [HttpGet("exchange-rate")]
        public Task<IActionResult> GetExchangeRate()
        {
            return Task.FromResult<IActionResult>(Ok(new
            {
                ethToUsd = 2500.00m,
                ethToGameCurrency = 10000.00m, // 1 ETH = 10,000 game currency units
                lastUpdated = DateTime.UtcNow
            }));
        }
    }

    public class DepositRequest
    {
        public decimal Amount { get; set; }
    }

    public class ConfirmDepositRequest
    {
        public Guid DepositId { get; set; }
        public decimal Amount { get; set; }
        public string TransactionHash { get; set; } = string.Empty;
    }

    public class WithdrawRequest
    {
        public decimal Amount { get; set; }
        public string EthereumAddress { get; set; } = string.Empty;
    }
}
