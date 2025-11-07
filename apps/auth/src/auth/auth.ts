import { Porto } from "rise-wallet";
// @ts-ignore
import { RelayClient } from "rise-wallet/viem";
import {
  generateSiweNonce,
  parseSiweMessage,
  verifySiweMessage,
} from "viem/siwe";
import { Context, Hono } from "hono";
import { Span, SpanStatusCode } from "@jb/tracer";

import { JWK } from "../jwk";
import { tracer } from "../instrumentation";

export function authHandler(jwk: JWK, app: Hono) {
  app.get("/siwe/nonce", async (c: Context): Promise<Response> => {
    return tracer.startActiveSpan("siwe-nonce-span", async (span: Span) => {
      return c.json({ nonce: generateSiweNonce() });
    });
  });

  app.post("/siwe/verify", async (c: Context): Promise<Response> => {
    return tracer.startActiveSpan("siwe-verify-span", async (span: Span) => {
      const { message, signature } = await c.req.json();

      const siweMessage = parseSiweMessage(message);
      const { address, chainId, nonce } = siweMessage;

      const porto = Porto.create();

      const client = RelayClient.fromPorto(porto, { chainId });

      const valid = await verifySiweMessage(client, {
        address: address!,
        message,
        signature,
        nonce,
      });

      if (!valid) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: "Invalid SIWE message",
        });

        span.recordException(new Error("Invalid SIWE message"));

        return c.json({ error: "Invalid SIWE message" }, 400);
      }

      const jwt = await jwk.sign({
        subject: address!,
        payload: {
          address,
          chainId,
        },
        expiresIn: "1h",
        audience: jwk.getIssuer(), // TODO: change it!
      });

      return c.json(
        {
          token: jwt.token,
          kid: jwt.kid,
          issuer: jwk.getIssuer(),
        },
        200
      );
    });
  });

  app.post("/siwe/verify/token", async (c: Context): Promise<Response> => {
    return tracer.startActiveSpan(
      "siwe-verify-token-span",
      async (span: Span) => {
        const { token } = await c.req.json();
        const { payload } = await jwk.verify(token, {
          audience: jwk.getIssuer(),
        });
        return c.json({ payload });
      }
    );
  });

  return app;
}
