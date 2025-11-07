import { Porto } from "rise-wallet";
// @ts-ignore
import { RelayClient } from "rise-wallet/viem";
import {
  generateSiweNonce,
  parseSiweMessage,
  verifySiweMessage,
} from "viem/siwe";
import { Context } from "hono";
import { Span, SpanStatusCode } from "@jb/tracer";

import { JWK } from "../jwk";
import { JWKVerifyError } from "../jwk/errors";

export class AuthHandler {
  constructor(private readonly jwk: JWK) {}

  async nonce(c: Context): Promise<Response> {
    return c.json({ nonce: generateSiweNonce() });
  }

  async verify(c: Context, span?: Span): Promise<Response> {
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
      throw new JWKVerifyError("Invalid SIWE signature");
    }

    const jwt = await this.jwk.sign({
      subject: address!,
      payload: {
        address,
        chainId,
      },
      expiresIn: "1h",
      audience: this.jwk.getIssuer(), // TODO: change it!
    });

    return c.json(
      {
        token: jwt.token,
        kid: jwt.kid,
        issuer: this.jwk.getIssuer(),
      },
      200
    );
  }

  async verifyToken(c: Context): Promise<Response> {
    const { token } = await c.req.json();
    const { payload } = await this.jwk.verify(token, {
      audience: this.jwk.getIssuer(),
    });
    return c.json({ payload });
  }
}
