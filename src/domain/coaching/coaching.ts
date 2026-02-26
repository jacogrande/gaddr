// Domain coaching types — pure types, no framework imports

export const COACHING_CATEGORIES = ["needs-evidence", "counterargument", "logic-gap", "strong-point"] as const;
export type CoachingCategory = (typeof COACHING_CATEGORIES)[number];

export type CoachingNote = {
  readonly claimQuotedText: string; // exact quotedText from DetectedClaim
  readonly note: string; // 1-2 sentence coaching tip
  readonly category: CoachingCategory;
};

export type CoachingResult = {
  readonly notes: readonly CoachingNote[];
};
