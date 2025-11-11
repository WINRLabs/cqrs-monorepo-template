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
import { randomUUID } from "crypto";
import parse from "parse-duration";

interface SiweOptions {
  nonceTTL: number;
  jwtAccessExp: string;
  jwtRefreshExp: string;
}

export class Siwe {
  private readonly nonceKey = "siwe:nonce";
  private readonly refreshTokenKey = "refresh_token";

  private nonceTTL = 60; // 1 minute
  private jwtAccessExp = "1h";
  private jwtRefreshExp = "1w";

  constructor(
    private readonly jwk: JWK,
    private readonly store: Store,

    options?: SiweOptions
  ) {
    this.nonceTTL = options?.nonceTTL || this.nonceTTL;
    this.jwtAccessExp = options?.jwtAccessExp || this.jwtAccessExp;
    this.jwtRefreshExp = options?.jwtRefreshExp || this.jwtRefreshExp;
  }

  private createNonceKey(nonce: string): string {
    return `${this.nonceKey}:${nonce}`;
  }

  private createRefreshTokenKey(address: `0x${string}`): string {
    return `${this.refreshTokenKey}:${address}`;
  }

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
    accessToken: string;
    refreshToken: string;
    kid: string;
    issuer: string;
  }> {
    const siweMessage = parseSiweMessage(message);
    const { address, chainId, nonce } = siweMessage;

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

    const id = randomUUID();

    await this.store.set(this.createRefreshTokenKey(address!), id, {
      ttl: Math.floor(parse(this.jwtRefreshExp)! / 1000),
    });

    const payload = {
      address,
      chainId,
      id,
    };

    const accessToken = await this.jwk.sign({
      subject: address!,
      payload,
      expiresIn: this.jwtAccessExp,
      audience: this.jwk.getIssuer(), // TODO: change it!
    });

    const refreshToken = await this.jwk.sign({
      subject: address!,
      payload,
      expiresIn: this.jwtRefreshExp,
      audience: this.jwk.getIssuer(), // TODO: change it!
    });

    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      kid: accessToken.kid,
      issuer: this.jwk.getIssuer(),
    };
  }

  async verifyRefreshToken(
    accessToken: string,
    refreshToken: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    kid: string;
    issuer: string;
  }> {
    const opts = {
      audience: this.jwk.getIssuer(), // TODO: change it!
    };

    const [accessTokenPayload, refreshTokenPayload] = await Promise.all([
      this.jwk.verifyExpiredToken(accessToken, opts),
      this.jwk.verify(refreshToken, opts),
    ]);

    if (
      accessTokenPayload.payload.address !==
        refreshTokenPayload.payload.address ||
      accessTokenPayload.payload.chainId !==
        refreshTokenPayload.payload.chainId ||
      accessTokenPayload.payload.id !== refreshTokenPayload.payload.id
    ) {
      throw new Error("Invalid access token or refresh token");
    }

    const refreshTokenExists = await this.store.exists(
      this.createRefreshTokenKey(
        accessTokenPayload.payload.address as `0x${string}`
      )
    );
    if (!refreshTokenExists) {
      throw new Error("Invalid refresh token");
    }

    await this.store.delete(
      this.createRefreshTokenKey(
        accessTokenPayload.payload.address as `0x${string}`
      )
    );

    const id = randomUUID();

    await this.store.set(
      this.createRefreshTokenKey(
        accessTokenPayload.payload.address as `0x${string}`
      ),
      id,
      { ttl: Math.floor(parse(this.jwtRefreshExp)! / 1000) }
    );

    const newAccessToken = await this.jwk.sign({
      subject: accessTokenPayload.payload.address as `0x${string}`,
      payload: {
        address: accessTokenPayload.payload.address!,
        chainId: accessTokenPayload.payload.chainId!,
        id,
      },
      expiresIn: this.jwtAccessExp,
      audience: this.jwk.getIssuer(), // TODO: change it!
    });

    const newRefreshToken = await this.jwk.sign({
      subject: accessTokenPayload.payload.address as `0x${string}`,
      payload: {
        address: accessTokenPayload.payload.address!,
        chainId: accessTokenPayload.payload.chainId!,
        id,
      },
      expiresIn: this.jwtRefreshExp,
      audience: this.jwk.getIssuer(), // TODO: change it!
    });

    return {
      accessToken: newAccessToken.token,
      refreshToken: newRefreshToken.token,
      kid: newAccessToken.kid,
      issuer: this.jwk.getIssuer(),
    };
  }
}
