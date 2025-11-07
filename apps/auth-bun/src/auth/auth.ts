import { Elysia, t } from "elysia";
import { Porto } from "rise-wallet";
// @ts-ignore
import { RelayClient } from "rise-wallet/viem";
import {
  generateSiweNonce,
  parseSiweMessage,
  verifySiweMessage,
} from "viem/siwe";
import { jwk } from "../jwk";

export const auth = new Elysia({ prefix: "/api" });

auth
  .get("/siwe/nonce", async () => {
    return { nonce: generateSiweNonce() };
  })
  .post(
    "/siwe/verify",
    async ({ body }) => {
      const { message, signature } = body;
      const siweMessage = parseSiweMessage(message);
      const { address, chainId, nonce } = siweMessage;

      const porto = Porto.create();

      const client = RelayClient.fromPorto(porto, { chainId });

      const valid = await verifySiweMessage(client, {
        address: address!,
        message,
        signature,
        nonce,
      });

      if (!valid) return { error: "invalid" };

      const jwt = await jwk.sign({
        subject: address!,
        payload: {
          address,
          chainId,
        },
        expiresIn: "1h",
        audience: jwk.getIssuer(), // TODO: change it!
      });

      return {
        token: jwt.token,
        kid: jwt.kid,
        issuer: jwk.getIssuer(),
      };
    },
    {
      body: t.Object({
        message: t.String(),
        signature: t.String(),
        address: t.String(),
      }),
    }
  )
  .post(
    "/siwe/verify/token",
    async ({ body }) => {
      const { token } = body;
      const { payload } = await jwk.verify(token, {
        audience: jwk.getIssuer(),
      });
      return { payload };
    },
    {
      body: t.Object({
        token: t.String(),
        audience: t.String(),
      }),
    }
  );
