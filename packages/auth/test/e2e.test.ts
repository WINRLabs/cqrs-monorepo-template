import { describe, it, expect } from 'vitest';

import { AuthVerifier } from '../src';

describe('Auth & Verify', async () => {
  const origin = 'http://localhost:8080/.well-known/jwks.json';
  const issuer = 'auth-service';
  const audience = 'auth-service';
  const token =
    'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRmMDJkNWYxLTI4YjktNDQzZS05OTJhLWM3MTliYWRmOTc4YSJ9.eyJhZGRyZXNzIjoiMHhjQ0I0NzBFMGNFM2Q3NEE3MkVENTQ5NkY0NjIxMjYxNUMxNzZiMTMwIiwiY2hhaW5JZCI6MTExNTU5MzEsInN1YiI6IjB4Y0NCNDcwRTBjRTNkNzRBNzJFRDU0OTZGNDYyMTI2MTVDMTc2YjEzMCIsImlzcyI6ImF1dGgtc2VydmljZSIsImF1ZCI6ImF1dGgtc2VydmljZSIsImlhdCI6MTc2Mjc3MDE3NCwiZXhwIjoxNzYyNzczNzc0fQ.Q1dKZ_U1Hcusgvmb4Fmdev7YmxC-fXXMQazgfhUUU3cH_ybq0qpEnVgkQMrMf3JT-6RniPvkzjgRtY3HvR7schJ_FMOsMMDt9ioaaYNtUKb5WF-1ZnWieDcQ-qzvD43WtZMNEVziIhTsY4z5Umm1wyMLKHw-WoIZQqhDlBk5c7hNxE4blptFT6bUWoRbtJlvEOvOuzk4n3A03dSrBM-MSRYC_GqA64Y0fZFdP-lKYUFsdoCY4UCa_80aLFhW6qdI0otp8TCitMFqlTaJ43kXji2E-lee9_74i6-fcvvDZvJXVlXbbp0ZcyUkM90sUrNYrG8vk4i2tl_9-IG_Q68-vA';

  it('should verify token', async () => {
    const verifier = new AuthVerifier(origin, issuer, audience);

    const payload = await verifier.verify(token);

    expect(payload).toHaveProperty('address');
    expect(payload).toHaveProperty('chainId');
  });
});
