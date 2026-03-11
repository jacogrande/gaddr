import type { ConstellationTheme } from "./constellation-types";

export type ConstellationLayoutPosition = {
  themeId: string;
  x: number;
  y: number;
};

const ELLIPSE_RADIUS_X = 0.36;
const ELLIPSE_RADIUS_Y = 0.32;
const CENTER_X = 0.5;
const CENTER_Y = 0.5;

export function computeConstellationLayout(
  themes: readonly ConstellationTheme[],
): ConstellationLayoutPosition[] {
  if (themes.length === 0) {
    return [];
  }

  // Themes are already sorted by leverage descending from the builder.
  // Place highest leverage at 12 o'clock (top), proceeding clockwise.
  const count = themes.length;
  const startAngle = -Math.PI / 2; // 12 o'clock

  return themes.map((theme, index) => {
    const angle = startAngle + (2 * Math.PI * index) / count;

    return {
      themeId: theme.id,
      x: CENTER_X + ELLIPSE_RADIUS_X * Math.cos(angle),
      y: CENTER_Y + ELLIPSE_RADIUS_Y * Math.sin(angle),
    };
  });
}
