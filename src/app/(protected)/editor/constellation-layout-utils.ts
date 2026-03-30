import type { ConstellationLayoutPosition } from "../../../domain/gadfly/constellation-layout";

export const CONSTELLATION_CANVAS_WIDTH = 1200;
export const CONSTELLATION_CANVAS_HEIGHT = 900;
export const CONSTELLATION_BRANCH_BASE_DISTANCE = 206;
export const CONSTELLATION_BRANCH_DISTANCE_PER_DEPTH = 30;
export const CONSTELLATION_BRANCH_MIN_SPREAD = Math.PI * 0.34;
export const CONSTELLATION_BRANCH_MAX_SPREAD = Math.PI * 0.92;
export const CONSTELLATION_BRANCH_SPREAD_PER_ITEM = 0.38;
export const CONSTELLATION_BRANCH_MIN_SIBLING_SEPARATION = 260;
export const CONSTELLATION_BRANCH_OUTWARD_STAGGER_FACTOR = 0.14;

/** Half the rendered width of the theme node (w-48 = 192px / 2) */
export const THEME_NODE_HALF_WIDTH = 96;

/** Approximate half-height of the theme node */
export const THEME_NODE_HALF_HEIGHT = 74;

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

  const outwardVectorX = Math.cos(outwardAngle);
  const outwardVectorY = Math.sin(outwardAngle);
  const perpendicularVectorX = -outwardVectorY;
  const perpendicularVectorY = outwardVectorX;
  const geometricLateralSpan = 2 * Math.tan(spread / 2) * distance;
  const minimumLateralSpan = CONSTELLATION_BRANCH_MIN_SIBLING_SEPARATION * (items.length - 1);
  const lateralSpan = Math.max(geometricLateralSpan, minimumLateralSpan);
  const lateralStep = lateralSpan / (items.length - 1);
  const startOffset = -lateralSpan / 2;

  return items.map((item, index) => {
    const lateralOffset = startOffset + lateralStep * index;
    const outwardDistance =
      distance + Math.abs(lateralOffset) * CONSTELLATION_BRANCH_OUTWARD_STAGGER_FACTOR;

    return {
      nodeId: item.id,
      x:
        rootX +
        outwardVectorX * outwardDistance +
        perpendicularVectorX * lateralOffset,
      y:
        rootY +
        outwardVectorY * outwardDistance +
        perpendicularVectorY * lateralOffset,
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
