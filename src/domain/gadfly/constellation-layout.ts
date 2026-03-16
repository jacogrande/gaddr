export type ConstellationLayoutPosition = {
  themeId: string;
  x: number;
  y: number;
};

type ConstellationLayoutItem = {
  id: string;
};

const ELLIPSE_RADIUS_X = 0.36;
const ELLIPSE_RADIUS_Y = 0.32;
const CENTER_X = 0.5;
const CENTER_Y = 0.5;

export function computeConstellationLayout(
  items: readonly ConstellationLayoutItem[],
): ConstellationLayoutPosition[] {
  if (items.length === 0) {
    return [];
  }

  // Items are expected to arrive in display priority order.
  // Place the first item at 12 o'clock, proceeding clockwise.
  const count = items.length;
  const startAngle = -Math.PI / 2; // 12 o'clock

  return items.map((item, index) => {
    const angle = startAngle + (2 * Math.PI * index) / count;

    return {
      themeId: item.id,
      x: CENTER_X + ELLIPSE_RADIUS_X * Math.cos(angle),
      y: CENTER_Y + ELLIPSE_RADIUS_Y * Math.sin(angle),
    };
  });
}
