import { describe, it, expect } from 'vitest';
import { errors } from 'jose';

import { AuthVerifier } from '../src';

describe('Auth & Verify', async () => {
  const origin = 'http://localhost:8080/.well-known/jwks.json';
  const issuer = 'auth-service';
  const audience = 'auth-service';
  const expiredToken =
    'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRmMDJkNWYxLTI4YjktNDQzZS05OTJhLWM3MTliYWRmOTc4YSJ9.eyJhZGRyZXNzIjoiMHg4MjIxNDA3NGFhNEY4ODY3MDM1ZWU4NUQwNWM4RWVDYTRhOUQxNDcxIiwiY2hhaW5JZCI6MTExNTU5MzEsInN1YiI6IjB4ODIyMTQwNzRhYTRGODg2NzAzNWVlODVEMDVjOEVlQ2E0YTlEMTQ3MSIsImlzcyI6ImF1dGgtc2VydmljZSIsImF1ZCI6ImF1dGgtc2VydmljZSIsImlhdCI6MTc2Mjc3MTg4NCwiZXhwIjoxNzYyNzc1NDg0fQ.EKGhZaET_v9X_SHuiP2ZIfvgHD8cSz0zLK5KnLLfmeJteK_1SDUccLblFnjcGHNs39AKbksWzlZCYIGFtUDjvKsThR0X3ewkXpP0zS8nQg3lb-N1C-c8bqQ0bN3NQpDAyWxKcNxPc_XXuvqEv7L1qBNI-MdaNwlRsLfpp8lvHzWWbzyNYOEf128PUqYWjrEwYfOuRb32eJ5OtO-zHfX2_k1LTQhmCIMumbi7JT8OwfAGqZdKpvZVvHsYVdxH8q-rbxLgcgU_wXZaa4-_IwUEH9L90i4KlVnSw5zWo6eq1GR9zrXbThee4lU_W_gJVEfuSeuZx5tzdtkdxuSPBMgrIQ';

  it('should verify token', async () => {
    const verifier = new AuthVerifier(origin, issuer, audience);

    const promise = verifier.verify(expiredToken);

    await expect(promise).rejects.toThrow(errors.JWTExpired);
  });
});
