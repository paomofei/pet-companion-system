import { create } from "zustand";
import { ToastMessage, ToastTone, WishHistoryItem } from "../types";

interface DrawModalState {
  phase: "closed" | "empty" | "spinning" | "result";
  result: WishHistoryItem | null;
}

interface UiStore {
  selectedDate: string;
  petBubble: string;
  isWishOverlayOpen: boolean;
  drawModal: DrawModalState;
  toasts: ToastMessage[];
  setSelectedDate: (value: string) => void;
  setPetBubble: (value: string) => void;
  openWishOverlay: () => void;
  closeWishOverlay: () => void;
  setDrawModal: (value: DrawModalState) => void;
  closeDrawModal: () => void;
  addToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
}

const todayIso = new Date().toISOString().slice(0, 10);

export const useUiStore = create<UiStore>((set) => ({
  selectedDate: todayIso,
  petBubble: "今天也一起努力赚能量吧！",
  isWishOverlayOpen: false,
  drawModal: { phase: "closed", result: null },
  toasts: [],
  setSelectedDate: (value) => set({ selectedDate: value }),
  setPetBubble: (value) => set({ petBubble: value }),
  openWishOverlay: () => set({ isWishOverlayOpen: true }),
  closeWishOverlay: () => set({ isWishOverlayOpen: false }),
  setDrawModal: (value) => set({ drawModal: value }),
  closeDrawModal: () => set({ drawModal: { phase: "closed", result: null } }),
  addToast: (message, tone = "info") =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: Date.now() + Math.random(),
          message,
          tone
        }
      ]
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }))
}));
