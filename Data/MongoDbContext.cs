using FlappyBird.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using FlappyBird.Configuration;

namespace FlappyBird.Data
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _db;

        public MongoDbContext(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString); 
            _db = client.GetDatabase(settings.Value.DatabaseName);
        }

        public IMongoCollection<User> Users => _db.GetCollection<User>("Users");
        public IMongoCollection<GameSession> GameSessions => _db.GetCollection<GameSession>("GameSessions");
    }
}