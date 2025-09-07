namespace FlappyBird.DTOs
{
    public class BetRequest
    {
        public decimal BetAmount { get; set; }
        public int TargetBarriers { get; set; }
        public string Difficulty { get; set; } = "Easy";
    }
}