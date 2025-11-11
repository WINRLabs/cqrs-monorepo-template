import {
  SignJWT,
  exportJWK,
  importSPKI,
  importPKCS8,
  jwtVerify,
  compactVerify,
  decodeJwt,
  decodeProtectedHeader,
  type CryptoKey,
} from "jose";
import {
  JWKExpiredError,
  JWKNotInitializedError,
  JWKVerifyError,
} from "./errors";
import parse from "parse-duration";

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  kid: string;
  createdAt: string;
}

interface JWKOptions {
  keyPair: () => string;
  issuer: string;
}

export class JWK {
  private keyPair!: KeyPair;
  private publicCryptoKey: CryptoKey | null = null;
  private privateCryptoKey: CryptoKey | null = null;
  private issuer: string;

  constructor(private readonly opts: JWKOptions) {
    this.issuer = opts.issuer;
    this.initialize();
  }

  async initialize() {
    const keyPair = JSON.parse(this.opts.keyPair());
    this.publicCryptoKey = await importSPKI(keyPair.publicKey, "RS256");
    this.privateCryptoKey = await importPKCS8(keyPair.privateKey, "RS256");
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

    const duration = parse(payload.expiresIn)!;

    const jwt = await new SignJWT(payload.payload)
      .setProtectedHeader({ alg: "RS256", kid: this.keyPair.kid })
      .setSubject(payload.subject)
      .setIssuer(this.issuer)
      .setAudience(payload.audience || this.issuer)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + duration / 1000)
      .sign(this.privateCryptoKey);

    return {
      token: jwt,
      kid: this.keyPair.kid,
    };
  }

  async verifyExpiredToken(token: string, options?: { audience?: string }) {
    await compactVerify(token, this.publicCryptoKey!);

    const payload = decodeJwt(token);
    const protectedHeader = decodeProtectedHeader(token);

    if (payload.iss !== this.issuer) {
      throw new JWKVerifyError("Invalid issuer");
    }

    const expectedAudience = options?.audience || this.issuer;
    if (payload.aud !== expectedAudience) {
      throw new JWKVerifyError("Invalid audience");
    }

    const expiresAt = payload.exp;

    if (!expiresAt) {
      throw new JWKVerifyError("Token does not have an expiration time");
    }

    const now = Math.floor(Date.now() / 1000);

    if (expiresAt >= now) {
      throw new JWKVerifyError("Token is not expired");
    }

    return {
      payload,
      header: protectedHeader,
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

      const expiresAt = payload.exp;

      if (!expiresAt) {
        throw new JWKExpiredError();
      }

      const now = Math.floor(Date.now() / 1000);

      if (expiresAt < now) {
        throw new JWKExpiredError();
      }

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

  getIssuer() {
    return this.issuer;
  }
}
