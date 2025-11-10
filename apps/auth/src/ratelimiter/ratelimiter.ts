import { Store } from "../store";

export class RateLimiter {
  private readonly limitKey = "ratelimiter:limit";
  private readonly maxLimit = 10;
  private readonly maxWindow = 60;

  constructor(private readonly store: Store) {}

  private createKey(key: string): string {
    return `ratelimiter:${key}`;
  }

  async limit(key: string) {
    const exists = await this.store.exists(this.createKey(key));
    if (!exists) {
      await this.store.set(this.createKey(key), "1".toString(), {
        ttl: this.maxWindow,
      });

      return;
    }

    const count = parseInt(await this.store.get(this.createKey(key)));

    if (count >= this.maxLimit) {
      throw new Error("Rate limit exceeded");
    }

    await this.store.incrby(this.createKey(key), 1);
  }
}
