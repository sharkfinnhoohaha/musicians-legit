// Anonymous-IP rate limiting via Upstash Redis.
// Returns { allowed: true } if Upstash isn't configured (dev-friendly).

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (limiter) return limiter;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(
      parseInt(process.env.ANON_DAILY_LIMIT || "3"),
      "1 d",
    ),
    prefix: "musicians-legit:rl",
  });
  return limiter;
}

export async function checkRateLimit(identifier: string) {
  const l = getLimiter();
  if (!l) return { success: true, remaining: Infinity, reset: 0 };
  return l.limit(identifier);
}
