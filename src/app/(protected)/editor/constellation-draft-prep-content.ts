import type { JSONContent } from "@tiptap/core";
import type { ConstellationDraftPrepGroup } from "./constellation-draft-prep-selectors";

export function buildConstellationTalkingPointsContent(
  groups: readonly ConstellationDraftPrepGroup[],
): JSONContent[] {
  const useInDraftGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.isUsedInDraft),
    }))
    .filter((group) => group.items.length > 0);

  if (useInDraftGroups.length === 0) {
    return [];
  }

  const content: JSONContent[] = [
    { type: "paragraph" },
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "First Draft Prep" }],
    },
  ];

  for (const group of useInDraftGroups) {
    content.push({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: group.theme?.title ?? "Collected talking points" }],
    });

    content.push({
      type: "bulletList",
      content: group.items.map((item) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `${item.node.title}: ${item.node.summary}`,
              },
            ],
          },
        ],
      })),
    });
  }

  return content;
}
