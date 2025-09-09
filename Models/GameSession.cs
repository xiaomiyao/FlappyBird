using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson;
using System;

namespace FlappyBird.Models
{
    public class GameSession
    {
        [BsonId] // Tells MongoDB this is the _id field
        [BsonRepresentation(BsonType.String)] // Ensures it's stored as string in DB
        public Guid Id { get; set; } = Guid.NewGuid();

        [BsonRepresentation(BsonType.String)]
        public Guid UserId { get; set; }

        public int BarriersToPass { get; set; }
        public int? BarriersPassed { get; set; }

        public decimal BetAmount { get; set; }
        public decimal? Payout { get; set; }

        public bool IsCompleted { get; set; } = false;
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;

        [BsonIgnoreIfNull]
        public User? User { get; set; }

        public string Difficulty { get; set; } = "Easy";


    }
}