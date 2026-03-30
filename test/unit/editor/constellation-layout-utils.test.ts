import { describe, expect, test } from "bun:test";
import {
  computeConstellationBranchPositions,
  scaleConstellationPositions,
  CONSTELLATION_CANVAS_WIDTH,
  CONSTELLATION_CANVAS_HEIGHT,
  EXPLORATION_NODE_HALF_HEIGHT,
  EXPLORATION_NODE_HALF_WIDTH,
  THEME_NODE_HALF_HEIGHT,
  THEME_NODE_HALF_WIDTH,
} from "../../../src/app/(protected)/editor/constellation-layout-utils";
import { computeConstellationLayout } from "../../../src/domain/gadfly/constellation-layout";

function theme(id: string, leverageScore: number): { id: string; leverageScore: number } {
  return {
    id,
    leverageScore,
  };
}

describe("scaleConstellationPositions", () => {
  test("returns empty array for empty input", () => {
    expect(scaleConstellationPositions([])).toEqual([]);
  });

  test("scales normalized positions to canvas pixel coordinates", () => {
    const normalized = [
      { themeId: "t1", x: 0, y: 0 },
      { themeId: "t2", x: 0.5, y: 0.5 },
      { themeId: "t3", x: 1, y: 1 },
    ];

    const scaled = scaleConstellationPositions(normalized);

    expect(scaled).toHaveLength(3);
    expect(scaled[0]).toEqual({ themeId: "t1", x: 0, y: 0 });
    expect(scaled[1]).toEqual({
      themeId: "t2",
      x: CONSTELLATION_CANVAS_WIDTH / 2,
      y: CONSTELLATION_CANVAS_HEIGHT / 2,
    });
    expect(scaled[2]).toEqual({
      themeId: "t3",
      x: CONSTELLATION_CANVAS_WIDTH,
      y: CONSTELLATION_CANVAS_HEIGHT,
    });
  });

  test("preserves themeIds from input", () => {
    const normalized = [
      { themeId: "alpha", x: 0.2, y: 0.3 },
      { themeId: "beta", x: 0.8, y: 0.7 },
    ];

    const scaled = scaleConstellationPositions(normalized);

    expect(scaled[0]?.themeId).toBe("alpha");
    expect(scaled[1]?.themeId).toBe("beta");
  });

  test("integrates with computeConstellationLayout", () => {
    const themes = [theme("t1", 0.9), theme("t2", 0.6)];
    const normalized = computeConstellationLayout(themes);
    const scaled = scaleConstellationPositions(normalized);

    expect(scaled).toHaveLength(2);
    for (const pos of scaled) {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(CONSTELLATION_CANVAS_WIDTH);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(CONSTELLATION_CANVAS_HEIGHT);
    }
  });

  test("keeps larger atlas theme cards from overlapping after scaling", () => {
    const themes = Array.from({ length: 10 }, (_, index) => theme(`t${String(index + 1)}`, 1));
    const scaled = scaleConstellationPositions(computeConstellationLayout(themes));

    for (let leftIndex = 0; leftIndex < scaled.length; leftIndex += 1) {
      const left = scaled[leftIndex];
      if (!left) {
        continue;
      }

      for (let rightIndex = leftIndex + 1; rightIndex < scaled.length; rightIndex += 1) {
        const right = scaled[rightIndex];
        if (!right) {
          continue;
        }

        const overlapsHorizontally =
          Math.abs(left.x - right.x) < THEME_NODE_HALF_WIDTH * 2;
        const overlapsVertically =
          Math.abs(left.y - right.y) < THEME_NODE_HALF_HEIGHT * 2;

        expect(overlapsHorizontally && overlapsVertically).toBeFalse();
      }
    }
  });

  test("fans branch children out without overlapping their cards", () => {
    const positions = computeConstellationBranchPositions(
      [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      {
        rootX: CONSTELLATION_CANVAS_WIDTH / 2,
        rootY: CONSTELLATION_CANVAS_HEIGHT / 2,
        outwardAngle: 0,
        distance: 236,
        spread: Math.PI * 0.92,
      },
    );

    for (let leftIndex = 0; leftIndex < positions.length; leftIndex += 1) {
      const left = positions[leftIndex];
      if (!left) {
        continue;
      }

      for (let rightIndex = leftIndex + 1; rightIndex < positions.length; rightIndex += 1) {
        const right = positions[rightIndex];
        if (!right) {
          continue;
        }

        const overlapsHorizontally =
          Math.abs(left.x - right.x) < EXPLORATION_NODE_HALF_WIDTH * 2;
        const overlapsVertically =
          Math.abs(left.y - right.y) < EXPLORATION_NODE_HALF_HEIGHT * 2;

        expect(overlapsHorizontally && overlapsVertically).toBeFalse();
      }
    }
  });
});
