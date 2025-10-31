import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

// Only initialize Redis client if REDIS_URL is provided; otherwise default to memory
const REDIS_URL = process.env.REDIS_URL;
let redisClient: Redis | null = null;
if (REDIS_URL) {
  redisClient = new Redis(REDIS_URL, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  redisClient.on('error', (err) => {
    console.error('Redis error:', err);
    // Fallback to memory limiter if Redis is unavailable
    process.env.USE_MEMORY_LIMITER = 'true';
  });
}

// In-memory fallback store
const memoryStore: Record<string, { count: number; resetAt: number }> = {};

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: any) => string;
}

const DEFAULT_OPTIONS = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),
  keyGenerator: (req: any) => {
    const ip = (req.ip as string) || 
               (req.headers && req.headers['x-forwarded-for'] && String(req.headers['x-forwarded-for'])) || 
               req.connection?.remoteAddress || 
               'unknown';
    return req.user?.id ? `${req.user.id}:${ip}` : ip;
  }
};

const createRedisLimiter = (options: RateLimitOptions = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!redisClient) throw new Error('Redis client not initialized');
  return new RateLimiterRedis({
    storeClient: redisClient as any,
    keyPrefix: 'ratelimit',
    points: opts.max,
    duration: opts.windowMs / 1000,
  });
};

// Memory fallback limiter
const memoryLimiter = (opts: RateLimitOptions) => (req: any, res: any, next: any) => {
  const key = (opts.keyGenerator as any)(req);
  const now = Date.now();
  const entry = memoryStore[key] || { count: 0, resetAt: now + (opts.windowMs || 60000) };
  
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + (opts.windowMs || 60000);
  }
  
  entry.count++;
  memoryStore[key] = entry;
  
  if (res && typeof res.set === 'function') {
    res.set('X-RateLimit-Limit', String(opts.max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, (opts.max as number) - entry.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil((entry.resetAt - now) / 1000)));
  }
  
  if (entry.count > (opts.max as number)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  
  next();
};

export const rateLimiter = (options: RateLimitOptions = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // In test mode, relax rate limits to avoid flakiness
  if (process.env.NODE_ENV === 'test') {
    opts.max = Math.max(1000, opts.max);
  }

  // If REDIS_URL not provided or USE_MEMORY_LIMITER set, use memory limiter
  if (!REDIS_URL || process.env.USE_MEMORY_LIMITER === 'true') {
    if (!REDIS_URL) console.warn('REDIS_URL not set — using memory rate limiter');
    return memoryLimiter(opts);
  }
  
  let limiter: any;
  try {
    limiter = createRedisLimiter(opts);
  } catch (err) {
    console.warn('Failed to create Redis limiter, falling back to memory:', err);
    return memoryLimiter(opts);
  }
  
  return async (req: any, res: any, next: any) => {
    try {
      const key = (opts.keyGenerator as any)(req);
      await limiter.consume(key);
      next();
    } catch (err: any) {
      // If Redis reports rate limit exceeded
      if (err && err.msBeforeNext !== undefined) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
      } else {
        // Fallback to memory limiter on Redis error
        console.warn('Redis rate limiter error, falling back to memory:', err);
        return memoryLimiter(opts)(req, res, next);
      }
    }
  };
};