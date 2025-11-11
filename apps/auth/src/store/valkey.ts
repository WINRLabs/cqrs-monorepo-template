import Valkey from "iovalkey";
import type { RedisOptions } from "iovalkey";
import type { Store } from "./store";

export class ValkeyStore implements Store {
  private client: Valkey | null = null;

  constructor(
    private readonly connectionUrl: string,
    private readonly options: RedisOptions
  ) {}

  async connect() {
    this.client = new Valkey(this.connectionUrl, this.options);
    await this.client.connect();
  }

  getClient() {
    if (!this.client) {
      throw new Error("Client not connected");
    }

    if (this.client.status !== "ready") {
      throw new Error(`Valkey client not ready: ${this.client.status}`);
    }

    return this.client;
  }

  async get(key: string): Promise<string> {
    const value = await this.getClient().get(key);
    if (!value) {
      throw new Error(`Key ${key} not found`);
    }

    return value;
  }

  async set(
    key: string,
    value: string,
    options?: { ttl?: number }
  ): Promise<void> {
    const client = this.getClient();

    if (options?.ttl) {
      await client.setex(key, options?.ttl || 60, value);
    } else {
      await client.set(key, value);
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.getClient().del(key);
    return result > 0;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.getClient().exists(key);
    return result > 0;
  }

  async incrby(key: string, value: number): Promise<number> {
    return await this.getClient().incrby(key, value);
  }
}
