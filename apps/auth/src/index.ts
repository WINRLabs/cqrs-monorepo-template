import "./instrumentation";
import { tracer, instrumentationConfig, spanCloser } from "./instrumentation";
import { logger } from "./logger";

import { readFileSync } from "fs";

import { Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { serve } from "@hono/node-server";
import { httpInstrumentationMiddleware } from "@hono/otel";

import { JWK, type KeyPair } from "./jwk";
import { AuthHandler } from "./auth";
import { Span, SpanStatusCode } from "@jb/tracer";

const PORT = parseInt(process.env.PORT || "8080");
const ISSUER = process.env.ISSUER || "auth-service";

const keysFile = process.env.KEYS_FILE || readFileSync("keys.json", "utf8");

const keyPair = JSON.parse(keysFile) as KeyPair;

const jwk = new JWK(keyPair, ISSUER);

const authHandler = new AuthHandler(jwk);

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

app.get("/siwe/nonce", (c: Context) => {
  return tracer.startActiveSpan("siwe-nonce-span", async (span: Span) => {
    return spanCloser(span, c, async (c: Context) => {
      return authHandler.nonce(c);
    });
  });
});

app.post("/siwe/verify", (c: Context) => {
  return tracer.startActiveSpan("siwe-verify-span", async (span: Span) => {
    return spanCloser(span, c, async (c: Context) => {
      try {
        return await authHandler.verify(c);
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        });

        span.recordException(error as Error);

        const errorResponse = new Response("Unauthorized", {
          status: 401, // this gets ignored
          headers: {
            Authenticate: 'error="invalid_token"',
          },
        });

        throw new HTTPException(401, { res: errorResponse });
      }
    });
  });
});

app.post("/siwe/verify/token", (c: Context) => {
  return tracer.startActiveSpan(
    "siwe-verify-token-span",
    async (span: Span) => {
      return spanCloser(span, c, async (c: Context) => {
        try {
          return await authHandler.verifyToken(c);
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : "Unknown error",
          });

          span.recordException(error as Error);

          const errorResponse = new Response("Unauthorized", {
            status: 401,
            headers: {
              Authenticate: 'error="invalid_token"',
            },
          });

          throw new HTTPException(401, { res: errorResponse });
        }
      });
    }
  );
});

async function main() {
  await jwk.initialize();

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

export default app;
