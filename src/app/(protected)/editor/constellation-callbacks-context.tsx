"use client";

import { createContext, useContext } from "react";

type ConstellationCallbacks = {
  onSelectNode: (nodeId: string) => void;
  onResetExploration: () => void;
  selectedNodeId: string | null;
  expandedThemeId: string | null;
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
