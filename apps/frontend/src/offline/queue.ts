export type OfflineActionKind =
  | "initUser"
  | "interactPet"
  | "createGoal"
  | "updateGoal"
  | "deleteGoal"
  | "createTask"
  | "updateTask"
  | "deleteTask"
  | "checkTask"
  | "uncheckTask"
  | "postponeTask"
  | "createWish"
  | "updateWish"
  | "drawWish";

export interface OfflineActionEntry {
  id?: number;
  kind: OfflineActionKind;
  payload: unknown;
  createdAt: string;
}

const DB_NAME = "pet-sys-offline-db";
const STORE_NAME = "operation_queue";
const DB_VERSION = 1;

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async <T,>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) => {
  const database = await openDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = action(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const enqueueOfflineAction = async (entry: OfflineActionEntry) => {
  await withStore("readwrite", (store) => store.add(entry));
};

export const listOfflineActions = async () => {
  const result = await withStore<OfflineActionEntry[]>("readonly", (store) => store.getAll());
  return result.sort((left, right) => (left.id ?? 0) - (right.id ?? 0));
};

export const removeOfflineAction = async (id: number) => {
  await withStore("readwrite", (store) => store.delete(id));
};

export const countOfflineActions = async () => withStore<number>("readonly", (store) => store.count());
