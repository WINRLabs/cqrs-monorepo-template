import { Context, TypedResponse } from "hono";

import { Span, SpanStatusCode } from "@jb/tracer";

import { Siwe } from "../siwe";
import { spanCloser, tracer } from "../instrumentation";
import { HTTPException } from "hono/http-exception";
import { logger } from "../logger";

export class SiweRoutes {
  constructor(private readonly siwe: Siwe) {}

  nonce = async (c: Context) => {
    return tracer.startActiveSpan("siwe-nonce-span", async (span: Span) =>
      spanCloser(span, c, async (c: Context) => {
        const nonce = await this.siwe.nonce(c);
        return c.json({ nonce });
      })
    );
  };

  verify = async (c: Context) => {
    return tracer.startActiveSpan("siwe-verify-span", async (span: Span) => {
      return spanCloser(span, c, async (c: Context) => {
        try {
          const { message, signature } = await c.req.json();
          const { token, kid, issuer } = await this.siwe.verify(
            message,
            signature
          );
          return c.json({ token, kid, issuer }, 200);
        } catch (error) {
          logger.error(error, "siwe-verify-span");

          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : "Unknown error",
          });

          span.recordException(error as Error);

          const errorResponse = new Response("Unauthorized", {
            status: 401,
          });

          throw new HTTPException(401, { res: errorResponse });
        }
      });
    });
  };

  verifyToken = async (c: Context) => {
    return tracer.startActiveSpan(
      "siwe-verify-token-span",
      async (span: Span) => {
        return spanCloser(span, c, async (c: Context) => {
          try {
            const { token } = await c.req.json();
            const payload = await this.siwe.verifyToken(token);
            return c.json(payload, 200);
          } catch (error) {
            logger.error(error, "siwe-verify-token-span");

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
  };
}
