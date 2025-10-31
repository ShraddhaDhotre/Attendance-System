// Very small in-memory rate limiter for dev/testing
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: any) => string;
}

const store: Record<string, RateLimitEntry> = {};

const DEFAULT_OPTIONS = {
  windowMs: 60_000, // 60s window
  max: 30, // max per window
  keyGenerator: (req: any) => {
    // If authenticated, use user ID + IP, otherwise just IP
    const ip = (req.ip as string) || 
               (req.headers && req.headers['x-forwarded-for'] && String(req.headers['x-forwarded-for'])) || 
               req.connection?.remoteAddress || 
               'unknown';
    return req.user?.id ? `${req.user.id}:${ip}` : ip;
  }
};

export const rateLimiter = (options: RateLimitOptions = {}) => (req: any, res: any, next: any) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const key = opts.keyGenerator(req);
  const now = Date.now();
  const entry = store[key] || { count: 0, resetAt: now + opts.windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + opts.windowMs;
  }
  entry.count++;
  store[key] = entry;
  if (res && typeof res.set === 'function') {
    res.set('X-RateLimit-Limit', String(opts.max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, opts.max - entry.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil((entry.resetAt - now) / 1000)));
  }
  if (entry.count > opts.max) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
};
