import { StateCreator } from "zustand";
import type { StoreMutatorIdentifier } from "zustand";
import type { PersistOptions, PersistApi } from "./types";

export const perKeyPersist =
  <
    T,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    config: StateCreator<T>,
    options: PersistOptions<T>
  ): StateCreator<T, Mps, [["per-key-persist", unknown], ...Mcs]> =>
  (set, get, api) => {
    const { name, storage, partialize } = options;
    let hasHydratedFlag = false;

    const persistKey = async (key: string, value: unknown): Promise<void> => {
      if (value == null || (partialize && !partialize?.[key as keyof T])) {
        return;
      }

      const storageKey = `${name}:${key}`;

      try {
        await storage.setItem(storageKey, JSON.stringify(value));
      } catch (error) {}
    };

    const rehydrate = async (): Promise<void> => {
      if (hasHydratedFlag) {
        return;
      }

      try {
        const allKeys = await storage.getAllKeys();
        const storageKeys = allKeys.filter((k) => {
          const prefix = `${name}:`;
          return (
            k.startsWith(prefix) &&
            (partialize ? partialize?.[k.replace(prefix, "") as keyof T] : true)
          );
        });

        if (storageKeys.length === 0) {
          hasHydratedFlag = true;
          return;
        }

        const entries = await storage.multiGet(storageKeys);
        const hydrated: Partial<T> = {};
        let hydratedCount = 0;

        for (const [storageKey, value] of entries) {
          if (value != null) {
            try {
              const key = storageKey.replace(`${name}:`, "") as keyof T;
              hydrated[key] = JSON.parse(value);
              hydratedCount++;
            } catch (error) {
              storage.removeItem(storageKey).catch(() => {});
            }
          }
        }

        if (hydratedCount > 0) {
          set(hydrated);
        }
      } catch (error) {
      } finally {
        hasHydratedFlag = true;
      }
    };

    (api as typeof api & { persist: PersistApi }).persist = {
      rehydrate,
      hasHydrated: () => hasHydratedFlag,
    };

    const handleStateUpdate = (
      partial: T | Partial<T> | ((state: T) => T | Partial<T>)
    ): void => {
      const nextState =
        typeof partial === "function"
          ? (partial as (s: T) => Partial<T>)(get())
          : partial;

      Object.keys(nextState).forEach((key) => {
        persistKey(key, nextState[key as keyof T]);
      });
    };

    const originalSetState = api.setState;

    api.setState = (
      partial: T | Partial<T> | ((state: T) => T | Partial<T>),
      replace?: boolean | undefined
    ) => {
      originalSetState(partial, replace);
      handleStateUpdate(partial);
    };

    return config(
      (partial, replace, ...args) => {
        set(partial, replace, ...args);
        handleStateUpdate(partial);
      },
      get,
      api
    );
  };
