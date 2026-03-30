export type ConstellationLayoutPosition = {
  themeId: string;
  x: number;
  y: number;
};

type ConstellationLayoutItem = {
  id: string;
};

const SINGLE_RING_MAX_ITEMS = 7;
const INNER_RING_RADIUS_X = 0.34;
const INNER_RING_RADIUS_Y = 0.29;
const OUTER_RING_RADIUS_X = 0.4;
const OUTER_RING_RADIUS_Y = 0.35;
const CENTER_X = 0.5;
const CENTER_Y = 0.5;
const START_ANGLE = -Math.PI / 2;

function computeRingSizes(itemCount: number): number[] {
  if (itemCount <= SINGLE_RING_MAX_ITEMS) {
    return [itemCount];
  }

  const outerRingCount = Math.floor(itemCount / 2);
  const innerRingCount = itemCount - outerRingCount;
  return [innerRingCount, outerRingCount];
}

export function computeConstellationLayout(
  items: readonly ConstellationLayoutItem[],
): ConstellationLayoutPosition[] {
  if (items.length === 0) {
    return [];
  }

  const ringSizes = computeRingSizes(items.length);
  const layout: ConstellationLayoutPosition[] = [];
  let itemOffset = 0;

  for (const [ringIndex, ringSize] of ringSizes.entries()) {
    const radiusX = ringIndex === 0 ? INNER_RING_RADIUS_X : OUTER_RING_RADIUS_X;
    const radiusY = ringIndex === 0 ? INNER_RING_RADIUS_Y : OUTER_RING_RADIUS_Y;
    const angleOffset =
      ringIndex === 0 || ringSize <= 1 ? 0 : Math.PI / ringSize;

    for (let index = 0; index < ringSize; index += 1) {
      const item = items[itemOffset + index];
      if (!item) {
        continue;
      }

      const angle = START_ANGLE + angleOffset + (2 * Math.PI * index) / ringSize;
      layout.push({
        themeId: item.id,
        x: CENTER_X + radiusX * Math.cos(angle),
        y: CENTER_Y + radiusY * Math.sin(angle),
      });
    }

    itemOffset += ringSize;
  }

  return layout;
}
