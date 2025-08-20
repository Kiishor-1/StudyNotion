const Redis = require("ioredis");

if (!process.env.UPSTASH_REDIS_URL) {
  throw new Error("UPSTASH_REDIS_URL is not defined in .env");
}

const redisClient = new Redis(process.env.UPSTASH_REDIS_URL, {
  tls: {},
  maxRetriesPerRequest: 5,
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redisClient.on("connect", () => {
  console.log("✅ Redis client connected to Upstash");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis client error:", err);
});

module.exports = redisClient;
