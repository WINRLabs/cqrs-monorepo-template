import { testClient } from "hono/testing";
import { describe, it, expect } from "vitest";

import app from "../src/index";
import { JWK, KeyPair } from "../src/jwk";

import { readFile } from "fs/promises";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { riseTestnet } from "viem/chains";
import siwe from "siwe";
import { createRemoteJWKSet, jwtVerify } from "jose";

describe("Auth & Verify", async () => {
  const domain = "localhost";
  const origin = "https://localhost:8080/api/siwe";

  const privateKey = generatePrivateKey();

  const walletClient = createWalletClient({
    transport: http("https://testnet.riselabs.xyz"),
    chain: riseTestnet,
    account: privateKeyToAccount(privateKey),
  });

  const keysFile =
    process.env.KEYS_FILE || (await readFile("keys.json", "utf8"));

  const keyPair = JSON.parse(keysFile) as KeyPair;

  const jwk = new JWK(keyPair, "auth-service");

  await jwk.initialize();

  const client: any = testClient(app);

  let token: string;

  it("should return a nonce", async () => {
    const res = await client.siwe.nonce.$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveProperty("nonce");
  });

  it("should verify a SIWE message", async () => {
    const nonce = await client.siwe.nonce.$get();
    const nonceData = await nonce.json();
    const { nonce: nonceValue } = nonceData as { nonce: string };

    const siweMessage = new siwe.SiweMessage({
      domain,
      address: walletClient.account.address,
      statement: nonceValue,
      uri: origin,
      version: "1",
      chainId: riseTestnet.id,
    });

    const message = siweMessage.prepareMessage();

    const signature = await walletClient.signMessage({
      message,
      account: walletClient.account,
    });

    const verifyPayload = {
      message,
      signature,
    };

    const res = await client.siwe.verify.$post({
      json: verifyPayload,
    });

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);

    const result = await res.json();

    expect(result).toHaveProperty("token");

    token = result.token;

    const verifyTokenRes = await client.siwe.verify.token.$post({
      json: {
        token: result.token,
      },
    });

    expect(verifyTokenRes.status).toBe(200);

    const verifyTokenResult = await verifyTokenRes.json();

    expect(verifyTokenResult).toHaveProperty("payload");
    expect(verifyTokenResult.payload).toHaveProperty("address");
    expect(verifyTokenResult.payload).toHaveProperty("chainId");
  });

  it("should verify token", async () => {
    const JWKS = createRemoteJWKSet(
      new URL("http://localhost:8080/.well-known/jwks.json")
    );

    console.log("token", token);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: "auth-service",
      audience: "auth-service",
    });

    expect(payload).toHaveProperty("address");
    expect(payload).toHaveProperty("chainId");
  });
});
