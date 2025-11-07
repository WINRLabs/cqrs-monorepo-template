import { treaty } from "@elysiajs/eden";
import type { AuthApp } from "../src/auth";
import { http, createWalletClient } from "viem";
import { riseTestnet } from "viem/chains";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import siwe from "siwe";

const app = treaty<AuthApp>("localhost:8080/api");

const domain = "localhost";
const origin = "https://localhost:8080/api/siwe";

const privateKey = generatePrivateKey();

const walletClient = createWalletClient({
  transport: http("https://testnet.riselabs.xyz"),
  chain: riseTestnet,
  account: privateKeyToAccount(privateKey),
});

// Call [GET] at '/'
const { data } = await app.siwe.nonce.get();

const { nonce } = data as { nonce: string };

const siweMessage = new siwe.SiweMessage({
  domain,
  address: walletClient.account.address,
  statement: nonce,
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
  address: walletClient.account.address,
  message,
  signature,
};

console.log("verifyPayload", verifyPayload);

const { data: tokenData } = await app.siwe.verify.post(verifyPayload);

console.log("tokenData", tokenData);

const { data: verifyData } = await app.siwe.verify.token.post({
  token: tokenData.token,
  audience: tokenData.issuer,
});

console.log("verifyData", verifyData);
