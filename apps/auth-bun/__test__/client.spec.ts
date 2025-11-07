import { createRemoteJWKSet, jwtVerify } from "jose";

const token =
  "eyJhbGciOiJSUzI1NiIsImtpZCI6ImJhMDRmZmNlLTRhNDAtNGE0ZS04ZWU4LTM2ZjU3MDUyN2JhYyJ9.eyJhZGRyZXNzIjoiMHgyYTczOTQ1N2U3ZDUyMDBCZUEzNWU1RDkxRWZFNkQwYjVCNjI1YzhjIiwiY2hhaW5JZCI6MTExNTU5MzEsInN1YiI6IjB4MmE3Mzk0NTdlN2Q1MjAwQmVBMzVlNUQ5MUVmRTZEMGI1QjYyNWM4YyIsImlzcyI6Imp3ay1zZXJ2ZXIiLCJhdWQiOiJqd2stc2VydmVyIiwiaWF0IjoxNzYyNTA0NDc2LCJleHAiOjE3NjI1MDgwNzZ9.UNbVz-GZl3x5zBUxaD3GiEKgSqpmdetEUI74qu8hSS2HVHNslAW7Z7QUthTgvVyb6q8gJFpQ90rqhH_g4uLqcBHaF4ZJr6IradqjwM_tM1bADj8j-WVqp-RgFIbaHJmHPi3yhJ1L8pBz0Ng8tj564Oj_UcP7BfsPp7Bs_PapYqvD6uamcbR7H1PMevkhXVACzCMT_gpGpqexCIyk-phMnFCIzRTpfUeUuOJgvCNrJi_83WuBDEWIAI77oarasZqtBmidHPSjTt1Fo_FyeAgEyJ4VtiQ137BMrWJxIwyAgx1i0hS4-VpMeCI8elpb5ThUuLKRmTAkcJN99o231KIMrg";

const JWKS = createRemoteJWKSet(
  new URL("http://localhost:8080/.well-known/jwks.json")
);

const { payload } = await jwtVerify(token, JWKS, {
  issuer: "jwk-server",
  audience: "jwk-server",
});

console.log("payload", payload);
