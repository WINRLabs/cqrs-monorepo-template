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

const PORT = parseInt(process.env.PORT || "8080");
const JWK_ISSUER = process.env.JWK_ISSUER || "auth-service";

const VALKEY_URL =
  process.env.VALKEY_URL || "redis://default:topsecret@localhost:6379";

const JWK_KEYS_FILE = process.env.JWK_KEYS_FILE || "keys.json";

const keyPair = JSON.parse(readFileSync(JWK_KEYS_FILE, "utf8")) as KeyPair;

const jwk = new JWK(keyPair, JWK_ISSUER);

const valkeyStore = new ValkeyStore(VALKEY_URL);

const siwe = new Siwe(jwk, valkeyStore);

const rateLimiter = new RateLimiter(valkeyStore);

const siweRoutes = new SiweRoutes(siwe);

const app = new Hono();

app.use("*", rateLimiterMiddleware(rateLimiter));

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
app.post("/siwe/verify/token", siweRoutes.verifyToken);

async function main() {
  await valkeyStore.connect();

  await jwk.initialize();

  const server = serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    (info) => {
      logger.info(`Server is running on http://localhost:${info.port}`);
    }
  );

  process.on("SIGINT", () => {
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    server.close((err) => {
      if (err) {
        console.error(err);
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
