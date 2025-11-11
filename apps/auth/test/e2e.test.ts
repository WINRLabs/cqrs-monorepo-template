// IMPORTANT: start local redis before testing

import { config } from "dotenv";

import { testClient } from "hono/testing";
import { describe, it, expect, vi } from "vitest";

import app from "../src/main";
import { JWK, KeyPair } from "../src/jwk";
import { InMemoryStore } from "../src/store";
import { Siwe } from "../src/siwe";

import { readFile } from "fs/promises";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { riseTestnet } from "viem/chains";
import siwe from "siwe";
import { createRemoteJWKSet, jwtVerify } from "jose";

describe("Auth & Verify", async () => {
  config({ path: ".env.test" });

  vi.useFakeTimers();

  const domain = "localhost";
  const origin = "http://localhost:8080";

  const privateKey = generatePrivateKey();

  const walletClient = createWalletClient({
    transport: http("https://testnet.riselabs.xyz"),
    chain: riseTestnet,
    account: privateKeyToAccount(privateKey),
  });

  const keysFile =
    process.env.KEYS_FILE || (await readFile("keys.json", "utf8"));

  const keyPair = JSON.parse(keysFile) as KeyPair;

  // const store = new InMemoryStore(); // TODO: make it work
  // const siweInstance = new Siwe(jwk, store);

  const jwk = new JWK(keyPair, "auth-service");
  await jwk.initialize();

  const client: any = testClient(app);

  let accessToken: string;
  let refreshToken: string;

  let verifyPayload: {
    message: string;
    signature: string;
  };

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
      nonce: nonceValue,
      uri: origin,
      version: "1",
      chainId: riseTestnet.id,
    });

    const message = siweMessage.prepareMessage();

    const signature = await walletClient.signMessage({
      message,
      account: walletClient.account,
    });

    verifyPayload = {
      message,
      signature,
    };

    const res = await client.siwe.verify.$post({
      json: verifyPayload,
    });

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);

    const result = await res.json();

    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
    expect(result).toHaveProperty("kid");
    expect(result).toHaveProperty("issuer");

    accessToken = result.accessToken;
    refreshToken = result.refreshToken;
  });

  it("should verify refresh token from the same client", async () => {
    vi.advanceTimersByTime(1_500); // 1.5 seconds

    const res = await client.siwe.verifyRefreshToken.$post({
      json: {
        accessToken,
        refreshToken,
      },
    });

    expect(res.status).toBe(200);

    const result = await res.json();

    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
    expect(result).toHaveProperty("kid");
    expect(result).toHaveProperty("issuer");
  });
});
