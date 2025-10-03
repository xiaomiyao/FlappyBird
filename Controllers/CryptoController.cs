using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FlappyBird.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CryptoController : ControllerBase
    {
        public CryptoController()
        {
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
                address = "0x742d35Cc6CF38c5d35E5E6B4f7C4E6A6E3f7f6B", // Contract address
                amount = request.Amount,
                message = "Deposit initiated. Send ETH to the address above."
            }));
        }

        [HttpPost("deposit/confirm")]
        public Task<IActionResult> ConfirmDeposit([FromBody] ConfirmDepositRequest request)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            // Placeholder implementation            
            return Task.FromResult<IActionResult>(Ok(new
            {
                depositId = request.DepositId,
                status = "confirmed",
                amount = request.Amount,
                message = "Deposit confirmed and balance updated."
            }));
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
                address = "0x742d35Cc6CF38c5d35E5E6B4f7C4E6A6E3f7f6B",
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
