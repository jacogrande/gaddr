import type { ConstellationLayoutPosition } from "../../../domain/gadfly/constellation-layout";

export const CONSTELLATION_CANVAS_WIDTH = 1200;
export const CONSTELLATION_CANVAS_HEIGHT = 900;
export const CONSTELLATION_BRANCH_BASE_DISTANCE = 206;
export const CONSTELLATION_BRANCH_DISTANCE_PER_DEPTH = 30;
export const CONSTELLATION_BRANCH_MIN_SPREAD = Math.PI * 0.34;
export const CONSTELLATION_BRANCH_MAX_SPREAD = Math.PI * 0.92;
export const CONSTELLATION_BRANCH_SPREAD_PER_ITEM = 0.38;

/** Half the rendered width of the theme node (w-56 = 224px / 2) */
export const THEME_NODE_HALF_WIDTH = 112;

/** Approximate half-height of the theme node */
export const THEME_NODE_HALF_HEIGHT = 84;

/** Half the rendered width of the draft node (w-52 = 208px / 2) */
export const DRAFT_NODE_HALF_WIDTH = 104;

/** Approximate half-height of the draft node */
export const DRAFT_NODE_HALF_HEIGHT = 60;

/** Half the rendered width of exploration branch nodes (w-56 = 224px / 2) */
export const EXPLORATION_NODE_HALF_WIDTH = 112;

/** Approximate half-height of exploration branch nodes */
export const EXPLORATION_NODE_HALF_HEIGHT = 82;

export function scaleConstellationPositions(
  normalized: readonly ConstellationLayoutPosition[],
): { themeId: string; x: number; y: number }[] {
  return normalized.map((pos) => ({
    themeId: pos.themeId,
    x: pos.x * CONSTELLATION_CANVAS_WIDTH,
    y: pos.y * CONSTELLATION_CANVAS_HEIGHT,
  }));
}

export function computeConstellationBranchPositions(
  items: readonly { id: string }[],
  {
    rootX,
    rootY,
    outwardAngle,
    distance = 220,
    spread = Math.PI * 0.82,
  }: {
    rootX: number;
    rootY: number;
    outwardAngle: number;
    distance?: number;
    spread?: number;
  },
): { nodeId: string; x: number; y: number }[] {
  if (items.length === 0) {
    return [];
  }

  if (items.length === 1) {
    const singleItem = items[0];
    if (!singleItem) {
      return [];
    }

    return [
      {
        nodeId: singleItem.id,
        x: rootX + Math.cos(outwardAngle) * distance,
        y: rootY + Math.sin(outwardAngle) * distance,
      },
    ];
  }

  const startAngle = outwardAngle - spread / 2;

  return items.map((item, index) => {
    const angle = startAngle + (spread * index) / (items.length - 1);

    return {
      nodeId: item.id,
      x: rootX + Math.cos(angle) * distance,
      y: rootY + Math.sin(angle) * distance,
    };
  });
}

export function computeConstellationBranchDistance(depth: number): number {
  return CONSTELLATION_BRANCH_BASE_DISTANCE + depth * CONSTELLATION_BRANCH_DISTANCE_PER_DEPTH;
}

export function computeConstellationBranchSpread(itemCount: number): number {
  return Math.min(
    CONSTELLATION_BRANCH_MAX_SPREAD,
    Math.max(CONSTELLATION_BRANCH_MIN_SPREAD, itemCount * CONSTELLATION_BRANCH_SPREAD_PER_ITEM),
  );
}
