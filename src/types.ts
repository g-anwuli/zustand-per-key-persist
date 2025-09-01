export type PersistApi = {
  rehydrate: () => Promise<void>;
  hasHydrated: () => boolean;
};

export type WithPersist<S> = S & { persist: PersistApi };

export type AyncStateStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<string[]>;
  multiGet: (keys: string[]) => Promise<[string, string | null][]>;
};

export type PersistOptions<S> = {
  name: string;
  storage: AyncStateStorage;
  partialize?: {
    [K in keyof S]?: boolean;
  };
};

declare module "zustand/vanilla" {
  interface StoreMutators<S, A> {
    "per-key-persist": WithPersist<S>;
  }
}
