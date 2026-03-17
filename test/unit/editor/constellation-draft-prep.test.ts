import { describe, expect, test } from "bun:test";
import { buildConstellationTalkingPointsContent } from "../../../src/app/(protected)/editor/constellation-draft-prep-content";
import { selectConstellationDraftPrepGroups } from "../../../src/app/(protected)/editor/constellation-draft-prep-selectors";
import type { ConstellationExplorationGraph } from "../../../src/domain/gadfly/constellation-types";
import {
  createConstellationEdge,
  createConstellationGraph,
  createConstellationNode,
  createConstellationWorkingSetItem,
} from "../fixtures/constellation-fixtures";

function graph(): ConstellationExplorationGraph {
  return createConstellationGraph({
    nodes: [
      createConstellationNode("seed-1", "seed"),
      createConstellationNode("theme-1", "theme", { title: "Theme One" }),
      createConstellationNode("theme-2", "theme", { title: "Theme Two" }),
      createConstellationNode("evidence-1", "evidence", { title: "Evidence One", isUsedInDraft: true }),
      createConstellationNode("counter-1", "counterargument", { title: "Counter One", isSavedToWorkingSet: true }),
      createConstellationNode("source-1", "source", { title: "Source One", isUsedInDraft: true, isPinned: true }),
    ],
    edges: [
      createConstellationEdge("seed-theme-1", "seed-1", "theme-1", "branches_into"),
      createConstellationEdge("seed-theme-2", "seed-1", "theme-2", "branches_into"),
      createConstellationEdge("theme-1-evidence", "theme-1", "evidence-1", "supports"),
      createConstellationEdge("theme-1-counter", "theme-1", "counter-1", "contradicts"),
      createConstellationEdge("theme-2-source", "theme-2", "source-1", "derived_from"),
    ],
    workingSet: [
      createConstellationWorkingSetItem("evidence-1", "use_in_draft", 1),
      createConstellationWorkingSetItem("counter-1", "saved", null),
      createConstellationWorkingSetItem("source-1", "use_in_draft", 0),
      createConstellationWorkingSetItem("source-1", "pinned", null),
    ],
  });
}

describe("constellation draft prep", () => {
  test("groups working set items by owning theme and sorts draft items first", () => {
    const groups = selectConstellationDraftPrepGroups(graph());

    expect(groups.map((group) => group.theme?.id)).toEqual(["theme-1", "theme-2"]);
    expect(groups[0]?.items.map((item) => item.node.id)).toEqual(["evidence-1", "counter-1"]);
    expect(groups[1]?.items.map((item) => item.node.id)).toEqual(["source-1"]);
    expect(groups[0]?.items[1]?.isSaved).toBe(true);
    expect(groups[1]?.items[0]?.isPinned).toBe(true);
    expect(groups[1]?.items[0]?.isSaved).toBe(false);
    expect(groups[1]?.items[0]?.isUsedInDraft).toBe(true);
  });

  test("builds grouped talking-points content from use-in-draft items only", () => {
    const groups = selectConstellationDraftPrepGroups(graph());
    const content = buildConstellationTalkingPointsContent(groups);

    expect(content[1]?.type).toBe("heading");
    expect(content[2]?.type).toBe("heading");
    expect(content[3]?.type).toBe("bulletList");
    expect(content[4]?.type).toBe("heading");
    expect(content[5]?.type).toBe("bulletList");
    expect(JSON.stringify(content)).toContain("Evidence One: Summary for evidence-1");
    expect(JSON.stringify(content)).toContain("Source One: Summary for source-1");
    expect(JSON.stringify(content)).not.toContain("Counter One");
  });
});
