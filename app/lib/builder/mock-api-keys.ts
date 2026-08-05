import { nanoid } from "nanoid";

type ApiKey = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
};

type ApiKeyStore = {
  keys: ApiKey[];
};

function getStore(): ApiKeyStore {
  const globalKey = "__builderApiKeys";
  const g = globalThis as typeof globalThis & {
    [globalKey]?: ApiKeyStore;
  };
  if (!g[globalKey]) {
    g[globalKey] = { keys: [] };
  }
  return g[globalKey];
}

export function listApiKeys(): ApiKey[] {
  return getStore().keys;
}

export function createApiKey(name: string): ApiKey {
  const key = `wf_${nanoid(24)}`;
  const entry: ApiKey = {
    id: nanoid(),
    name,
    key,
    createdAt: new Date().toISOString(),
  };
  const store = getStore();
  store.keys = [entry, ...store.keys];
  return entry;
}

export function deleteApiKey(id: string): void {
  const store = getStore();
  store.keys = store.keys.filter((k) => k.id !== id);
}
