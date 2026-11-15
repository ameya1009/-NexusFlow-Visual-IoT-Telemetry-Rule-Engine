/**
 * Lightweight in-memory rate limiter for telemetry ingestion.
 * Follows 'ponytail' lean engineering: zero external dependencies, minimal memory footprint.
 */
const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60 * 1000; // 1-minute window
  const max = options.max || (parseInt(process.env.TELEMETRY_RATE_LIMIT_MAX, 10) || 1000); // 1000 requests/window default
  const hits = new Map();

  // Periodic garbage collection of expired IP windows
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(ip);
      }
    }
  }, windowMs);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "global";
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      hits.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetTimeSec = Math.max(1, Math.ceil((record.startTime + windowMs - now) / 1000));

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetTimeSec);

    if (record.count > max) {
      res.setHeader("Retry-After", resetTimeSec);
      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        message: `Too many telemetry ingestion requests. Maximum limit is ${max} requests per minute.`,
        retryAfterSeconds: resetTimeSec,
      });
    }

    next();
  };
};

module.exports = createRateLimiter;
