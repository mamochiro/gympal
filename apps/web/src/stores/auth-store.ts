"use client";

import { create } from "zustand";

interface AuthState {
  expired: boolean;
  setExpired: (v: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  expired: false,
  setExpired: (v) => set({ expired: v }),
  clear: () => set({ expired: false }),
}));
