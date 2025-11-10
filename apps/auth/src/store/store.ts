export interface Store {
  connect(): Promise<void>;
  get(key: string): Promise<string>;
  set(key: string, value: string, options?: { ttl?: number }): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
}
