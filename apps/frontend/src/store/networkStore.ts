import { create } from "zustand";

interface NetworkStore {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  setOnline: (value: boolean) => void;
  setSyncing: (value: boolean) => void;
  setPendingSyncCount: (value: number) => void;
}

const detectOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine);

export const useNetworkStore = create<NetworkStore>((set) => ({
  isOnline: detectOnline(),
  isSyncing: false,
  pendingSyncCount: 0,
  setOnline: (value) => set({ isOnline: value }),
  setSyncing: (value) => set({ isSyncing: value }),
  setPendingSyncCount: (value) => set({ pendingSyncCount: value })
}));
