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
          const { accessToken, refreshToken, kid, issuer } =
            await this.siwe.verify(message, signature);

          return c.json({ accessToken, refreshToken, kid, issuer }, 200);
        } catch (error) {
          throw errorResponse(error as Error, span, "siwe-verify-span");
        }
      });
    });
  };

  verifyRefreshToken = async (c: Context) => {
    return tracer.startActiveSpan(
      "siwe-verify-refresh-token-span",
      async (span: Span) => {
        return spanCloser(span, c, async (c: Context) => {
          try {
            const { accessToken, refreshToken } = await c.req.json();
            const {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
              kid,
              issuer,
            } = await this.siwe.verifyRefreshToken(accessToken, refreshToken);

            return c.json(
              {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                kid,
                issuer,
              },
              200
            );
          } catch (error: unknown) {
            throw errorResponse(
              error as Error,
              span,
              "siwe-verify-refresh-token-span"
            );
          }
        });
      }
    );
  };
}

function errorResponse(error: Error, span: Span, spanName: string) {
  logger.error(error, spanName);

  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error instanceof Error ? error.message : "Unknown error",
  });

  span.recordException(error as Error);

  const errorResponse = new Response("Unauthorized", {
    status: 401,
  });

  return new HTTPException(401, { res: errorResponse });
}
