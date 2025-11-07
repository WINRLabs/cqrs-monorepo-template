import "./instrumentation";
import { tracer, instrumentationConfig } from "./instrumentation";
import { logger } from "./logger";

import { readFile } from "fs/promises";

import { Context, Hono } from "hono";
import { serve } from "@hono/node-server";
import { httpInstrumentationMiddleware } from "@hono/otel";

import { JWK, type KeyPair } from "./jwk";
import { authHandler } from "./auth";

const PORT = parseInt(process.env.PORT || "8080");
const ISSUER = process.env.ISSUER || "jwk-server";

async function main() {
  const keysFile =
    process.env.KEYS_FILE || (await readFile("keys.json", "utf8"));

  const keyPair = JSON.parse(keysFile) as KeyPair;

  const jwk = new JWK(keyPair, ISSUER);

  await jwk.initialize();

  const app = new Hono();

  app.use(
    httpInstrumentationMiddleware({
      serviceName: instrumentationConfig.serviceName,
      captureRequestHeaders: ["user-agent"],
      serviceVersion: "1.0.0",
      tracer,
    })
  );

  app.get("/health", (c: Context) => c.json({ status: "ok" }));

  app.get("/.well-known/jwks.json", async (c: Context) =>
    c.json(await jwk.getJWKS())
  );

  authHandler(jwk, app);

  serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    (info) => {
      logger.info(`Server is running on http://localhost:${info.port}`);
    }
  );
}

main().catch((error) => {
  logger.error(error, "Error starting server");
  process.exit(1);
});
