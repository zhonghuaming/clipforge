"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

export const useThemeStore = create<{ mode: ThemeMode; setMode: (mode: ThemeMode) => void }>()(
  persist((set) => ({ mode: "light", setMode: (mode) => set({ mode }) }), {
    name: "clipforge-theme",
  }),
);
