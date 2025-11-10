import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { riseTestnet } from "viem/chains";
import * as siwe from "siwe";

const domain = "localhost";
const origin = "http://localhost:8080";

const privateKey = generatePrivateKey();

const walletClient = createWalletClient({
  transport: http("https://testnet.riselabs.xyz"),
  chain: riseTestnet,
  account: privateKeyToAccount(privateKey),
});

async function getNonce() {
  const nonce = await fetch(`${origin}/siwe/nonce`);
  const nonceData = await nonce.json();
  return nonceData as { nonce: string };
}

async function verify(message: string, signature: string) {
  const verify = await fetch(`${origin}/siwe/verify`, {
    method: "POST",
    body: JSON.stringify({ message, signature }),
  });
  const verifyData = await verify.json();
  return verifyData;
}

async function verifyToken(token: string) {
  const verifyToken = await fetch(`${origin}/siwe/verify/token`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  const verifyTokenData = await verifyToken.json();
  return verifyTokenData;
}

async function main() {
  const { nonce } = await getNonce();

  console.log("Nonce:", nonce);

  const message = new siwe.SiweMessage({
    domain,
    address: walletClient.account.address,
    statement: nonce,
    nonce: nonce,
    uri: origin,
    version: "1",
    chainId: riseTestnet.id,
  });

  const siweMessage = message.prepareMessage();

  const signature = await walletClient.signMessage({
    message: siweMessage,
    account: walletClient.account,
  });

  const res = (await verify(siweMessage, signature)) as { token: string };
  console.log("Verify:", res);

  const tokenData = await verifyToken(res.token);
  console.log("Verify Token:", tokenData);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
