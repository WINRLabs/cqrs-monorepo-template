import type { Store } from "./store";

export class InMemoryStore implements Store {
  private store: Map<string, string> = new Map();

  async connect() {
    return;
  }

  async get(key: string): Promise<string> {
    const value = this.store.get(key);
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
    this.store.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  incrby(key: string, value: number): Promise<number> {
    const current = this.store.get(key) || 0;
    this.store.set(key, (Number(current) + value).toString());
    return Promise.resolve(Number(current) + value);
  }
}
