import { describe, expect, test } from "bun:test";
import { selectNextConstellationFocusableItemId } from "../../../src/app/(protected)/editor/constellation-keyboard";

describe("constellation keyboard helpers", () => {
  test("selects the first item when nothing is focused", () => {
    expect(
      selectNextConstellationFocusableItemId(["theme-1", "theme-2"], null, "next"),
    ).toBe("theme-1");
  });

  test("wraps focus forward and backward across visible items", () => {
    const itemIds = ["theme-1", "node-1", "summary-1"];

    expect(selectNextConstellationFocusableItemId(itemIds, "theme-1", "next")).toBe("node-1");
    expect(selectNextConstellationFocusableItemId(itemIds, "summary-1", "next")).toBe("theme-1");
    expect(selectNextConstellationFocusableItemId(itemIds, "theme-1", "previous")).toBe("summary-1");
  });
});
