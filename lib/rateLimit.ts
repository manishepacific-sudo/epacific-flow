type RateLimitStore = Map<string, { count: number; lastReset: number }>;

const rateLimit = (limit: number, windowMs: number) => {
  const store: RateLimitStore = new Map();

  return {
    check: (ip: string) => {
      const now = Date.now();
      const record = store.get(ip);

      if (!record) {
        store.set(ip, { count: 1, lastReset: now });
        return true;
      }

      if (now - record.lastReset > windowMs) {
        store.set(ip, { count: 1, lastReset: now });
        return true;
      }

      if (record.count >= limit) {
        return false;
      }

      record.count += 1;
      return true;
    },
  };
};

export const limiter = rateLimit(5, 60 * 1000); // 5 requests per minute
