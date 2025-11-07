import {
  SignJWT,
  exportJWK,
  importSPKI,
  importPKCS8,
  jwtVerify,
  type CryptoKey,
} from "jose";
import { JWKNotInitializedError, JWKVerifyError } from "./errors";

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  kid: string;
  createdAt: string;
}

export class JWK {
  private keyPair: KeyPair;
  private publicCryptoKey: CryptoKey | null = null;
  private privateCryptoKey: CryptoKey | null = null;
  private issuer: string;

  constructor(keyPair: KeyPair, issuer: string = "jwk-server") {
    this.keyPair = keyPair;
    this.issuer = issuer;
  }

  async initialize() {
    this.publicCryptoKey = await importSPKI(this.keyPair.publicKey, "RS256");
    this.privateCryptoKey = await importPKCS8(this.keyPair.privateKey, "RS256");
  }

  async sign(payload: {
    subject: string;
    payload: Record<string, any>;
    expiresIn: string;
    audience?: string;
  }) {
    if (!this.privateCryptoKey) {
      throw new JWKNotInitializedError();
    }

    const jwt = await new SignJWT(payload.payload)
      .setProtectedHeader({ alg: "RS256", kid: this.keyPair.kid })
      .setSubject(payload.subject)
      .setIssuer(this.issuer)
      .setAudience(payload.audience || this.issuer)
      .setIssuedAt()
      .setExpirationTime(payload.expiresIn)
      .sign(this.privateCryptoKey);

    return {
      token: jwt,
      kid: this.keyPair.kid,
    };
  }

  async verify(token: string, options?: { audience?: string }) {
    if (!this.publicCryptoKey) {
      throw new JWKNotInitializedError();
    }

    try {
      const { payload, protectedHeader } = await jwtVerify(
        token,
        this.publicCryptoKey,
        {
          issuer: this.issuer,
          audience: options?.audience || this.issuer,
        }
      );

      return {
        valid: true,
        payload,
        header: protectedHeader,
      };
    } catch (error) {
      throw new JWKVerifyError("Invalid token");
    }
  }

  async getJWKS() {
    if (!this.publicCryptoKey) {
      throw new JWKNotInitializedError();
    }

    const jwk = await exportJWK(this.publicCryptoKey);

    return {
      keys: [
        {
          ...jwk,
          kid: this.keyPair.kid,
          alg: "RS256",
          use: "sig",
        },
      ],
    };
  }

  getKeyId() {
    return this.keyPair.kid;
  }

  getCreatedAt() {
    return this.keyPair.createdAt;
  }

  getIssuer() {
    return this.issuer;
  }
}
