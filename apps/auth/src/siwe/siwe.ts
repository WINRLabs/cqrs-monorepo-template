import { Porto } from "rise-wallet";
// @ts-ignore
import { RelayClient } from "rise-wallet/viem";
import {
  generateSiweNonce,
  parseSiweMessage,
  verifySiweMessage,
} from "viem/siwe";
import { Context } from "hono";

import type { Store } from "../store";
import { JWK, JWKVerifyError } from "../jwk";
import { logger } from "../logger";

export class Siwe {
  private readonly nonceKey = "siwe:nonce";
  private readonly nonceTTL = 60; // 1 minute

  private createNonceKey(nonce: string): string {
    return `${this.nonceKey}:${nonce}`;
  }

  constructor(
    private readonly jwk: JWK,
    private readonly store: Store
  ) {}

  async nonce(c: Context): Promise<string> {
    const nonce = generateSiweNonce();
    await this.store.set(this.createNonceKey(nonce), nonce, {
      ttl: this.nonceTTL,
    });
    return nonce;
  }

  async verify(
    message: string,
    signature: `0x${string}`
  ): Promise<{
    token: string;
    kid: string;
    issuer: string;
  }> {
    const siweMessage = parseSiweMessage(message);
    const { address, chainId, nonce } = siweMessage;

    logger.debug({ address, chainId, nonce }, "Verifying SIWE message");

    const nonceExists = await this.store.exists(this.createNonceKey(nonce!));
    if (!nonceExists) {
      throw new Error("Invalid nonce");
    }

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

    return {
      token: jwt.token,
      kid: jwt.kid,
      issuer: this.jwk.getIssuer(),
    };
  }

  async verifyToken(token: string): Promise<Record<string, any>> {
    const { payload } = await this.jwk.verify(token, {
      audience: this.jwk.getIssuer(),
    });

    return payload;
  }
}
