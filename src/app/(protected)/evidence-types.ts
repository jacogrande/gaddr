// Shared serialized evidence types — used across editor and library app layers

import type { Stance } from "../../domain/evidence/evidence-card";

export type SerializedCard = {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  quoteSnippet: string | null;
  userSummary: string | null;
  caveats: string | null;
  stance: Stance;
  createdAt: string;
  updatedAt: string;
};

export type EvidenceLinkData = {
  id: string;
  essayId: string;
  evidenceCardId: string;
  claimText: string;
  anchorBlockIndex: number;
  card: {
    id: string;
    sourceTitle: string;
    stance: Stance;
  };
};

export type EvidenceCardSummary = {
  id: string;
  sourceTitle: string;
  quoteSnippet: string | null;
  userSummary: string | null;
  stance: Stance;
};
