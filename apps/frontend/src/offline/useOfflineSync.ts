import { useEffect } from "react";
import { apiRuntime } from "../api/runtime";
import { countOfflineActions, enqueueOfflineAction, listOfflineActions, OfflineActionKind, removeOfflineAction } from "./queue";
import { useNetworkStore } from "../store/networkStore";

const refreshPendingCount = async () => {
  if (!apiRuntime.supportsOfflineQueue) {
    useNetworkStore.getState().setPendingSyncCount(0);
    return;
  }
  const count = await countOfflineActions();
  useNetworkStore.getState().setPendingSyncCount(count);
};

export const queueOfflineJournal = async (kind: OfflineActionKind, payload: unknown) => {
  if (!apiRuntime.supportsOfflineQueue) {
    return;
  }
  await enqueueOfflineAction({
    kind,
    payload,
    createdAt: new Date().toISOString()
  });
  await refreshPendingCount();
};

export const flushOfflineJournal = async () => {
  if (!apiRuntime.supportsOfflineQueue) {
    useNetworkStore.getState().setPendingSyncCount(0);
    return;
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  const { setSyncing } = useNetworkStore.getState();
  setSyncing(true);

  try {
    const entries = await listOfflineActions();
    for (const entry of entries) {
      // Mock mode has already applied the local optimistic write, so reconnect only clears the pending journal.
      if (entry.id) {
        await removeOfflineAction(entry.id);
      }
    }
    await refreshPendingCount();
  } finally {
    setSyncing(false);
  }
};

export const runOfflineCapableAction = async <T,>(
  kind: OfflineActionKind,
  payload: unknown,
  executeLocal: () => Promise<T>
) => {
  if (!apiRuntime.supportsOfflineQueue) {
    return executeLocal();
  }

  const result = await executeLocal();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await queueOfflineJournal(kind, payload);
  }

  return result;
};

export const useOfflineSync = () => {
  const setOnline = useNetworkStore((state) => state.setOnline);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      void flushOfflineJournal();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    if (apiRuntime.supportsOfflineQueue) {
      void refreshPendingCount();
    } else {
      useNetworkStore.getState().setPendingSyncCount(0);
    }
    if (apiRuntime.supportsOfflineQueue && typeof navigator !== "undefined" && navigator.onLine) {
      void flushOfflineJournal();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);
};
