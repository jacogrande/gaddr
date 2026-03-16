export type LegacyConstellationBoardMode =
  | "hidden"
  | "transition_in"
  | "overview"
  | "focus_theme"
  | "transition_out";

export type ConstellationExplorationBoardMode =
  | "hidden"
  | "transition_in"
  | "atlas_overview"
  | "local_exploration"
  | "draft_prep"
  | "transition_out";

export type ConstellationBoardMode = ConstellationExplorationBoardMode;
