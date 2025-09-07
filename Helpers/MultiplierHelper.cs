namespace FlappyBird.Helpers
{
    public class MultiplierHelper
    {
        public static decimal GetMultiplier(DifficultyLevel difficulty)
        {
            return difficulty switch
            {
                DifficultyLevel.Easy => 1.2m,
                DifficultyLevel.Medium => 1.5m,
                DifficultyLevel.Hard => 2.0m,
                DifficultyLevel.Extreme => 2.5m,
                _ => 1.0m
            };
        }
    }
}
