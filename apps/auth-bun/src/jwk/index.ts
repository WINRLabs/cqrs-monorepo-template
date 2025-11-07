import { JWK, type KeyPair } from "./jwk";

const ISSUER = process.env.ISSUER || "jwk-server";

const keysFile = process.env.KEYS_FILE || (await Bun.file("keys.json").text());

const keyPair = JSON.parse(keysFile) as KeyPair;

const jwk = new JWK(keyPair, ISSUER);

await jwk.initialize();

export { jwk };
