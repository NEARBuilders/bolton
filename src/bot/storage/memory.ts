export interface MemoryStorage<T> {
  read(key: string): Promise<T | undefined>;
  write(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export function createMemoryStorage<T>(): MemoryStorage<T> {
  const store = new Map<string, T>();

  return {
    async read(key: string): Promise<T | undefined> {
      return store.get(key);
    },
    async write(key: string, value: T): Promise<void> {
      store.set(key, value);
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };
}
