namespace FlappyBird.DTOs
{
        public class GameResultRequest
        {
            public Guid GameId { get; set; }
            public int Score { get; set; }
            public bool Won { get; set; }
        }
    
}
