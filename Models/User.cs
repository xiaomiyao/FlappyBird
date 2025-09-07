using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace FlappyBird.Models
{
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.String)]
        public Guid Id { get; set; } = Guid.NewGuid();

        [BsonElement("username")]
        public string Username { get; set; } = null!;

        [BsonElement("passwordHash")]
        public string PasswordHash { get; set; } = null!;

        [BsonElement("balance")]
        public decimal Balance { get; set; } = 1000;

        // Optional – reference to game sessions
        public List<Guid> GameSessionIds { get; set; } = new();
    }
}