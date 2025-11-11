import "dotenv/config";
import "./instrumentation";
import { tracer, instrumentationConfig } from "./instrumentation";
import { logger } from "./logger";

import { readFileSync } from "fs";

import { Context, Hono } from "hono";
import { serve } from "@hono/node-server";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { HTTPException } from "hono/http-exception";

import { JWK, type KeyPair } from "./jwk";
import { Siwe } from "./siwe";
import { ValkeyStore } from "./store";
import { SiweRoutes } from "./routes";
import { RateLimiter, rateLimiterMiddleware } from "./ratelimiter";

const jwk = new JWK({
  issuer: process.env.JWK_ISSUER || "auth-service",
  keyPair: () => {
    return process.env.JWK_KEYS_RAW
      ? process.env.JWK_KEYS_RAW
      : readFileSync(process.env.JWK_KEYS_FILE || "keys.json", "utf8");
  },
});

const valkeyStore = new ValkeyStore(
  process.env.VALKEY_URL || "redis://default:topsecret@localhost:6379",
  {
    lazyConnect: true,
    autoResubscribe: true,
    reconnectOnError: (error) => true,
  }
);

const siwe = new Siwe(jwk, valkeyStore, {
  nonceTTL: 60,
  jwtAccessExp: process.env.JWT_ACCESS_EXP!,
  jwtRefreshExp: process.env.JWT_REFRESH_EXP!,
});

const rateLimiter = new RateLimiter(valkeyStore);

const siweRoutes = new SiweRoutes(siwe);

const app = new Hono();

if (process.env.NODE_ENV !== "test") {
  app.use("*", rateLimiterMiddleware(rateLimiter));
}

app.use(
  httpInstrumentationMiddleware({
    serviceName: instrumentationConfig.serviceName,
    captureRequestHeaders: ["user-agent"],
    serviceVersion: "1.0.0",
    tracer,
  })
);

app.onError((error, c) => {
  logger.error(error, "Error in request");

  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }

  return c.json({ error: "Internal server error" }, 500);
});

app.get("/health", (c: Context) => c.json({ status: "ok" }));

app.get("/.well-known/jwks.json", async (c: Context) =>
  c.json(await jwk.getJWKS())
);

app.get("/siwe/nonce", siweRoutes.nonce);
app.post("/siwe/verify", siweRoutes.verify);
app.post("/siwe/verify/refresh", siweRoutes.verifyRefreshToken);

async function main() {
  await valkeyStore.connect();

  await jwk.initialize();

  const server = serve(
    {
      fetch: app.fetch,
      port: parseInt(process.env.PORT || "8080"),
    },
    (info) => {
      logger.info(`Server is running on http://localhost:${info.port}`);
    }
  );

  process.on("SIGINT", () => {
    logger.info("SIGINT received, shutting down server");
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down server");
    server.close((err) => {
      if (err) {
        logger.error(err, "Error shutting down server");
        process.exit(1);
      }
      process.exit(0);
    });
  });
}

main().catch((error) => {
  logger.error(error, "Error starting server");
  process.exit(1);
});

export default app;

export type AppType = typeof app;
