// Small key-value persistence over expo-sqlite. Tests and web fall back to memory.
export type KeyValue = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
};

export function memoryStorage(): KeyValue {
  const map = new Map<string, string>();
  return { get: (key) => map.get(key) ?? null, set: (key, value) => { map.set(key, value); }, remove: (key) => { map.delete(key); } };
}

let shared: KeyValue | undefined;

export function deviceStorage(): KeyValue {
  if (shared) return shared;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Storage = require('expo-sqlite/kv-store').default as {
      getItemSync(key: string): string | null; setItemSync(key: string, value: string): void; removeItemSync(key: string): void;
    };
    Storage.getItemSync('cargoflow.probe');
    shared = { get: (key) => Storage.getItemSync(key), set: (key, value) => Storage.setItemSync(key, value), remove: (key) => Storage.removeItemSync(key) };
  } catch {
    shared = memoryStorage();
  }
  return shared;
}
