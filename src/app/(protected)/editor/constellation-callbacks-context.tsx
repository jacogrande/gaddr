"use client";

import { createContext, useContext } from "react";

type ConstellationCallbacks = {
  onFocusTheme: (themeId: string) => void;
  onBackToOverview: () => void;
  focusedThemeId: string | null;
  highestLeverageThemeId: string | null;
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
