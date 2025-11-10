import { createMiddleware } from "hono/factory";
import { Context, type MiddlewareHandler } from "hono";
import { Netmask } from "netmask";

import { RateLimiter } from "./ratelimiter";
import { logger } from "../logger";

const headers = ["CF-Connecting-IP", "X-Forwarded-For", "X-Real-IP"];

const whiteListedIpBlocks = [new Netmask("127.0.0.1/32")];

const getClientIp = (c: Context): string | null => {
  if (process.env.NODE_ENV === "test") {
    return "127.0.0.1";
  }

  for (const header of headers) {
    const value = c.req.header(header);
    if (value) {
      return value;
    }
  }

  const remoteAddress = c.env.incoming.socket.remoteAddress;

  if (remoteAddress === "::1") {
    return "127.0.0.1";
  }

  if (whiteListedIpBlocks.some((ip) => ip.contains(remoteAddress))) {
    return "127.0.0.1";
  }

  return remoteAddress;
};

export const rateLimiterMiddleware = (
  rateLimiter: RateLimiter
): MiddlewareHandler =>
  createMiddleware(async (c: Context, next) => {
    try {
      const clientIp = getClientIp(c);

      logger.debug({ clientIp }, "Getting client IP");

      if (!clientIp) {
        return c.json({ error: "Invalid client IP" }, 400);
      }

      logger.debug({ clientIp }, "Limiting rate");

      await rateLimiter.limit(clientIp);

      logger.debug({ clientIp }, "Rate limited");
    } catch (error) {
      logger.error(error, "Error limiting rate");

      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    return next();
  });

export type RateLimiterMiddleware = typeof rateLimiterMiddleware;
