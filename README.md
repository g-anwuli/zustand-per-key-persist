# zustand-per-key-persist

Per-key persistence middleware for Zustand stores. Each state property is stored separately for better performance and granular control.

## Installation

```bash
npm install zustand-per-key-persist
# or
yarn add zustand-per-key-persist
# or
pnpm add zustand-per-key-persist
```

## Quick Start

```typescript
import { create } from 'zustand';
import { perKeyPersist } from 'zustand-per-key-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useStore = create(
  perKeyPersist(
    (set) => ({
      user: null,
      settings: { theme: 'dark' },
      cache: {},
    }),
    {
      name: 'app-store',
      storage: AsyncStorage,
    }
  )
);

// Rehydrate on app start
useStore.persist.rehydrate();
```

## API

### PersistOptions
```typescript
{
  name: string;                           // Storage namespace
  storage: AsyncStateStorage;             // Storage implementation  
  partialize?: {                          // Optional: select keys to persist
    [K in keyof S]?: boolean;
  };
}
```

### Storage Interface
Works with AsyncStorage, MMKV, or any storage implementing:
```typescript
interface AsyncStateStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<string[]>;
  multiGet: (keys: string[]) => Promise<[string, string | null][]>;
}
```

## Examples

### Selective Persistence
```typescript
const useStore = create(
  perKeyPersist(
    (set) => ({
      userProfile: null,    // Persisted
      apiCache: {},        // Persisted
      tempData: [],        // Not persisted
    }),
    {
      name: 'my-store',
      storage: AsyncStorage,
      partialize: {
        userProfile: true,
        apiCache: true,
      }
    }
  )
);
```

### With MMKV
```typescript
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const mmkvStorage = {
  getItem: async (key: string) => storage.getString(key) ?? null,
  setItem: async (key: string, value: string) => storage.set(key, value),
  removeItem: async (key: string) => storage.delete(key),
  getAllKeys: async () => storage.getAllKeys(),
  multiGet: async (keys: string[]) => 
    keys.map(key => [key, storage.getString(key) ?? null]),
};

const useStore = create(
  perKeyPersist(config, { name: 'fast-store', storage: mmkvStorage })
);
```

## Why Per-Key?

**Traditional**: Entire store in one storage entry
```
"store": '{"user":{},"cache":{},"settings":{}}'
```

**Per-Key**: Each property stored separately  
```
"store:user": '{"id":1,"name":"John"}'
"store:cache": '{"posts":[...]}'
"store:settings": '{"theme":"dark"}'
```

**Benefits**: Better performance, selective loading, fault tolerance, reduced I/O

## Behavior

- **Null/undefined values**: Skipped (preserves cache during API failures)
- **Corrupted data**: Automatically cleaned up during rehydration  
- **Type safety**: Full TypeScript support with proper inference

## Requirements

- Zustand ^4.0.0
- Compatible async storage (AsyncStorage, MMKV, etc.)

## License

MIT