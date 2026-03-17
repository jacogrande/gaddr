import { describe, expect, test } from "bun:test";
import { computeConstellationLayout } from "../../../src/domain/gadfly/constellation-layout";

function theme(id: string, leverageScore: number): { id: string; leverageScore: number } {
  return {
    id,
    leverageScore,
  };
}

describe("computeConstellationLayout", () => {
  test("returns empty array for zero themes", () => {
    const positions = computeConstellationLayout([]);
    expect(positions).toEqual([]);
  });

  test("places single theme at top center (12 o'clock)", () => {
    const positions = computeConstellationLayout([theme("t1", 0.8)]);

    expect(positions).toHaveLength(1);
    const pos = positions[0];
    expect(pos).toBeDefined();
    if (!pos) return;

    expect(pos.themeId).toBe("t1");
    expect(pos.x).toBeCloseTo(0.5, 2);
    // y = center(0.5) - radiusY(0.32) = 0.18
    expect(pos.y).toBeCloseTo(0.18, 2);
  });

  test("places 5 themes in radial positions", () => {
    const themes = [
      theme("t1", 0.9),
      theme("t2", 0.8),
      theme("t3", 0.7),
      theme("t4", 0.6),
      theme("t5", 0.5),
    ];

    const positions = computeConstellationLayout(themes);

    expect(positions).toHaveLength(5);

    for (const pos of positions) {
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.x).toBeLessThan(1);
      expect(pos.y).toBeGreaterThan(0);
      expect(pos.y).toBeLessThan(1);
    }
  });

  test("highest leverage theme has lowest y (top position)", () => {
    const themes = [
      theme("t1", 0.9),
      theme("t2", 0.5),
      theme("t3", 0.3),
    ];

    const positions = computeConstellationLayout(themes);

    expect(positions).toHaveLength(3);

    const firstPos = positions[0];
    expect(firstPos).toBeDefined();
    if (!firstPos) return;

    // First theme (highest leverage) should be at the top
    for (let index = 1; index < positions.length; index += 1) {
      const other = positions[index];
      if (!other) continue;
      expect(firstPos.y).toBeLessThanOrEqual(other.y);
    }
  });

  test("positions are deterministic for same input", () => {
    const themes = [theme("t1", 0.8), theme("t2", 0.6)];

    const first = computeConstellationLayout(themes);
    const second = computeConstellationLayout(themes);

    expect(first).toEqual(second);
  });

  test("output themeIds match input order", () => {
    const themes = [
      theme("t1", 0.9),
      theme("t2", 0.7),
      theme("t3", 0.5),
    ];

    const positions = computeConstellationLayout(themes);

    expect(positions[0]?.themeId).toBe("t1");
    expect(positions[1]?.themeId).toBe("t2");
    expect(positions[2]?.themeId).toBe("t3");
  });

  test("all positions are within 0-1 bounds", () => {
    const themes = [
      theme("t1", 0.9),
      theme("t2", 0.8),
      theme("t3", 0.7),
      theme("t4", 0.6),
      theme("t5", 0.5),
    ];

    const positions = computeConstellationLayout(themes);

    for (const pos of positions) {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(1);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(1);
    }
  });

  test("all positions are distinct", () => {
    const themes = [
      theme("t1", 0.9),
      theme("t2", 0.8),
      theme("t3", 0.7),
      theme("t4", 0.6),
    ];

    const positions = computeConstellationLayout(themes);
    const coords = positions.map((pos) => `${pos.x.toFixed(6)},${pos.y.toFixed(6)}`);
    const unique = new Set(coords);

    expect(unique.size).toBe(positions.length);
  });
});
