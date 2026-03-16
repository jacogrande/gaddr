"use client";

import { createContext, useContext } from "react";

type ConstellationCallbacks = {
  onSelectTheme: (themeId: string) => void;
  onClearSelection: () => void;
  selectedThemeId: string | null;
};

const ConstellationCallbacksContext = createContext<ConstellationCallbacks | null>(null);

export function useConstellationCallbacks(): ConstellationCallbacks {
  const ctx = useContext(ConstellationCallbacksContext);
  if (!ctx) {
    throw new Error("useConstellationCallbacks must be used within ConstellationCallbacksProvider");
  }
  return ctx;
}

export const ConstellationCallbacksProvider = ConstellationCallbacksContext.Provider;
