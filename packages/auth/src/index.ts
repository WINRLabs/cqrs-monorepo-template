import { createRemoteJWKSet, jwtVerify } from 'jose';

export class AuthVerifier {
  private readonly JWKS: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly origin: string,
    private readonly issuer: string,
    private readonly audience: string,
  ) {
    this.JWKS = createRemoteJWKSet(new URL(this.origin));
  }

  async verify(token: string) {
    const { payload } = await jwtVerify(token, this.JWKS, {
      issuer: this.issuer,
      audience: this.audience,
    });

    const expiresAt = payload.exp;

    if (!expiresAt) {
      throw new Error('Token does not have an expiration time');
    }

    const now = Math.floor(Date.now() / 1000);

    if (expiresAt < now) {
      throw new Error('Token expired');
    }

    return payload;
  }
}
