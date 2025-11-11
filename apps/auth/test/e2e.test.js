"use strict";
// IMPORTANT: start local redis before testing
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
var testing_1 = require("hono/testing");
var vitest_1 = require("vitest");
var main_1 = __importDefault(require("../src/main"));
var jwk_1 = require("../src/jwk");
var promises_1 = require("fs/promises");
var accounts_1 = require("viem/accounts");
var viem_1 = require("viem");
var chains_1 = require("viem/chains");
var siwe_1 = __importDefault(require("siwe"));
(0, vitest_1.describe)("Auth & Verify", function () { return __awaiter(void 0, void 0, void 0, function () {
    var domain, origin, privateKey, walletClient, keysFile, _a, keyPair, jwk, client, accessToken, refreshToken, verifyPayload;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                (0, dotenv_1.config)({ path: ".env.test" });
                vitest_1.vi.useFakeTimers();
                domain = "localhost";
                origin = "http://localhost:8080";
                privateKey = (0, accounts_1.generatePrivateKey)();
                walletClient = (0, viem_1.createWalletClient)({
                    transport: (0, viem_1.http)("https://testnet.riselabs.xyz"),
                    chain: chains_1.riseTestnet,
                    account: (0, accounts_1.privateKeyToAccount)(privateKey),
                });
                _a = process.env.KEYS_FILE;
                if (_a) return [3 /*break*/, 2];
                return [4 /*yield*/, (0, promises_1.readFile)("keys.json", "utf8")];
            case 1:
                _a = (_b.sent());
                _b.label = 2;
            case 2:
                keysFile = _a;
                keyPair = JSON.parse(keysFile);
                jwk = new jwk_1.JWK(keyPair, "auth-service");
                return [4 /*yield*/, jwk.initialize()];
            case 3:
                _b.sent();
                client = (0, testing_1.testClient)(main_1.default);
                (0, vitest_1.it)("should return a nonce", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var res, _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0: return [4 /*yield*/, client.siwe.nonce.$get()];
                            case 1:
                                res = _b.sent();
                                (0, vitest_1.expect)(res.status).toBe(200);
                                _a = vitest_1.expect;
                                return [4 /*yield*/, res.json()];
                            case 2:
                                _a.apply(void 0, [_b.sent()]).toHaveProperty("nonce");
                                return [2 /*return*/];
                        }
                    });
                }); });
                (0, vitest_1.it)("should verify a SIWE message", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var nonce, nonceData, nonceValue, siweMessage, message, signature, res, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, client.siwe.nonce.$get()];
                            case 1:
                                nonce = _a.sent();
                                return [4 /*yield*/, nonce.json()];
                            case 2:
                                nonceData = _a.sent();
                                nonceValue = nonceData.nonce;
                                siweMessage = new siwe_1.default.SiweMessage({
                                    domain: domain,
                                    address: walletClient.account.address,
                                    statement: nonceValue,
                                    nonce: nonceValue,
                                    uri: origin,
                                    version: "1",
                                    chainId: chains_1.riseTestnet.id,
                                });
                                message = siweMessage.prepareMessage();
                                return [4 /*yield*/, walletClient.signMessage({
                                        message: message,
                                        account: walletClient.account,
                                    })];
                            case 3:
                                signature = _a.sent();
                                verifyPayload = {
                                    message: message,
                                    signature: signature,
                                };
                                return [4 /*yield*/, client.siwe.verify.$post({
                                        json: verifyPayload,
                                    })];
                            case 4:
                                res = _a.sent();
                                (0, vitest_1.expect)(res.status).not.toBe(401);
                                (0, vitest_1.expect)(res.status).toBe(200);
                                return [4 /*yield*/, res.json()];
                            case 5:
                                result = _a.sent();
                                (0, vitest_1.expect)(result).toHaveProperty("accessToken");
                                (0, vitest_1.expect)(result).toHaveProperty("refreshToken");
                                (0, vitest_1.expect)(result).toHaveProperty("kid");
                                (0, vitest_1.expect)(result).toHaveProperty("issuer");
                                accessToken = result.accessToken;
                                refreshToken = result.refreshToken;
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
        }
    });
}); });
//# sourceMappingURL=e2e.test.js.map