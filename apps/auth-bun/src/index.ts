import { instrumentation } from "./instrumentation";

import { Elysia, t } from "elysia";
import { SpanStatusCode } from "@opentelemetry/api";
import { getCurrentSpan } from "@elysiajs/opentelemetry";
import { openapi } from "@elysiajs/openapi";

import { jwk } from "./jwk";
import { auth } from "./auth/auth";

console.log(`[INFO] Keys loaded successfully. Kid: ${jwk.getKeyId()}`);

const port = process.env.PORT || 8080;

new Elysia()
  .use(instrumentation)
  .use(openapi())
  .use(auth)
  .onError(({ error }) => {
    const span = getCurrentSpan();

    span?.recordException(error);

    span?.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    console.error(
      `[ERROR] ${error instanceof Error ? error.message : "Unknown error"}`
    );

    return error instanceof Error ? error.message : "Unknown error";
  })
  .get("/.well-known/jwks.json", async () => jwk.getJWKS())
  .get("/health", () => ({
    status: "ok",
    keyId: jwk.getKeyId(),
    keyCreatedAt: jwk.getCreatedAt(),
  }))
  .listen(port);

console.log(`[INFO] JWK Server is running on http://localhost:${port}`);
