import type { ConstellationLayoutPosition } from "../../../domain/gadfly/constellation-layout";

export const CONSTELLATION_CANVAS_WIDTH = 1200;
export const CONSTELLATION_CANVAS_HEIGHT = 900;

/** Half the rendered width of the theme node (w-56 = 224px / 2) */
export const THEME_NODE_HALF_WIDTH = 112;

/** Approximate half-height of the theme node */
export const THEME_NODE_HALF_HEIGHT = 84;

/** Half the rendered width of the draft node (w-52 = 208px / 2) */
export const DRAFT_NODE_HALF_WIDTH = 104;

/** Approximate half-height of the draft node */
export const DRAFT_NODE_HALF_HEIGHT = 60;

export function scaleConstellationPositions(
  normalized: readonly ConstellationLayoutPosition[],
): { themeId: string; x: number; y: number }[] {
  return normalized.map((pos) => ({
    themeId: pos.themeId,
    x: pos.x * CONSTELLATION_CANVAS_WIDTH,
    y: pos.y * CONSTELLATION_CANVAS_HEIGHT,
  }));
}
