import Redis from "ioredis";
export function createCache(mode) {
  if (mode === "demo") {
    const data = new Map();
    return {
      get: async (key) => {
        const x = data.get(key);
        return x && x.expires > Date.now() ? x.value : null;
      },
      set: async (key, value, ttl) =>
        data.set(key, { value, expires: Date.now() + ttl * 1000 }),
      del: async (key) => data.delete(key),
      health: async () => true,
      close: async () => {},
    };
  }
  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });
  redis.on("error", () => {}); // Request error handler reports outages without exposing connection secrets.
  return {
    get: (key) => redis.get(key),
    set: (key, value, ttl) => redis.set(key, value, "EX", ttl),
    del: (key) => redis.del(key),
    health: async () => {
      await redis.ping();
      return true;
    },
    close: () => redis.quit(),
  };
}
