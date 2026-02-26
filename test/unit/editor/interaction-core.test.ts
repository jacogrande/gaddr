import { describe, expect, test } from "bun:test";
import {
  collectExitingModifierKeys,
  createModifierOrderingState,
  eventMatchesHotkey,
  filterCommandsByQuery,
  listCommandHotkeyEntries,
  mergeDisplayModifiers,
  orderModifierBadges,
  type DisplayModifierBadge,
  type HotkeyCommand,
  type ModifierBadge,
} from "../../../src/domain/editor/interaction-core";

const COMMANDS = [
  { id: "bold", label: "Bold", hotkeys: ["Mod-b"] },
  { id: "blockquote", label: "Blockquote", hotkeys: ["Mod-Shift-b"] },
  { id: "code-block", label: "Code Block", hotkeys: ["Mod-Alt-c"] },
] as const satisfies readonly HotkeyCommand[];

describe("eventMatchesHotkey", () => {
  test("matches hotkeys with modifiers", () => {
    expect(
      eventMatchesHotkey(
        {
          key: "k",
          metaKey: false,
          ctrlKey: true,
          shiftKey: false,
          altKey: false,
        },
        "Mod-k",
      ),
    ).toBe(true);
  });

  test("rejects hotkeys when required modifiers are missing", () => {
    expect(
      eventMatchesHotkey(
        {
          key: "b",
          metaKey: false,
          ctrlKey: true,
          shiftKey: false,
          altKey: false,
        },
        "Mod-Shift-b",
      ),
    ).toBe(false);
  });
});

describe("filterCommandsByQuery", () => {
  test("returns full command list for empty query", () => {
    expect(filterCommandsByQuery(COMMANDS, "")).toEqual([...COMMANDS]);
  });

  test("ranks label prefix before substring and hotkey matches", () => {
    const result = filterCommandsByQuery(COMMANDS, "blo");
    expect(result.map((command) => command.id)).toEqual(["blockquote", "code-block"]);
  });

  test("matches by hotkey text", () => {
    const result = filterCommandsByQuery(COMMANDS, "alt-c");
    expect(result.map((command) => command.id)).toEqual(["code-block"]);
  });
});

describe("listCommandHotkeyEntries", () => {
  test("creates a flat list of command/hotkey pairs", () => {
    const entries = listCommandHotkeyEntries(COMMANDS);
    expect(entries).toEqual([
      { command: COMMANDS[0], hotkey: "Mod-b" },
      { command: COMMANDS[1], hotkey: "Mod-Shift-b" },
      { command: COMMANDS[2], hotkey: "Mod-Alt-c" },
    ]);
  });
});

describe("orderModifierBadges", () => {
  test("preserves activation order across updates and resets after empty selection", () => {
    let state = createModifierOrderingState();

    let result = orderModifierBadges([{ key: "italic", label: "I" }], state);
    expect(result.orderedBadges.map((badge) => badge.key)).toEqual(["italic"]);
    state = result.nextState;

    result = orderModifierBadges(
      [
        { key: "underline", label: "U" },
        { key: "italic", label: "I" },
      ],
      state,
    );
    expect(result.orderedBadges.map((badge) => badge.key)).toEqual(["italic", "underline"]);
    state = result.nextState;

    result = orderModifierBadges([{ key: "underline", label: "U" }], state);
    expect(result.orderedBadges.map((badge) => badge.key)).toEqual(["underline"]);
    state = result.nextState;

    result = orderModifierBadges([], state);
    expect(result.orderedBadges).toEqual([]);
    state = result.nextState;

    result = orderModifierBadges([{ key: "bold", label: "B" }], state);
    expect(result.orderedBadges.map((badge) => badge.key)).toEqual(["bold"]);
  });
});

describe("mergeDisplayModifiers and collectExitingModifierKeys", () => {
  test("marks inactive modifiers as exiting and keeps active ones visible", () => {
    const previous: DisplayModifierBadge[] = [
      { key: "bold", label: "B", exiting: false },
      { key: "italic", label: "I", exiting: false },
    ];
    const active: ModifierBadge[] = [{ key: "italic", label: "I" }];

    const merged = mergeDisplayModifiers(previous, active);
    expect(merged).toEqual([
      { key: "bold", label: "B", exiting: true },
      { key: "italic", label: "I", exiting: false },
    ]);
    expect(collectExitingModifierKeys(merged)).toEqual(["bold"]);
  });
});
