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

    return payload;
  }
}
