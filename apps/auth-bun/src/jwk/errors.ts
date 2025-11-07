export class JWKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JWKError";
  }
}

export class JWKNotInitializedError extends JWKError {
  constructor() {
    super("Keys not initialized. Call initialize() first.");
  }
}

export class JWKInvalidTokenError extends JWKError {
  constructor() {
    super("Invalid token.");
  }
}

export class JWKInvalidPublicKeyError extends JWKError {
  constructor() {
    super("Invalid public key.");
  }
}

export class JWKInvalidPrivateKeyError extends JWKError {
  constructor() {
    super("Invalid private key.");
  }
}
