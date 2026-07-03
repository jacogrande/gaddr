import { describe, expect, test } from "bun:test";
import {
  initialSparkSession,
  sparkSession,
  type SparkSessionEvent,
  type SparkSessionState,
} from "../../../src/domain/spark/spark-session";
import type { SparkCandidate, SparkLens } from "../../../src/domain/spark/types";

function candidate(lens: SparkLens = "economic"): SparkCandidate {
  return { lens, question: `What about ${lens}?`, grounding: "the draft" };
}

/** Drive a sequence of events from an initial state. */
function run(
  start: SparkSessionState,
  events: readonly SparkSessionEvent[],
): SparkSessionState {
  return events.reduce(sparkSession, start);
}

const RESTING: SparkSessionState = { status: "resting" };
const SUMMONING: SparkSessionState = { status: "summoning" };
const SPENT: SparkSessionState = { status: "spent" };

describe("initialSparkSession", () => {
  test("starts resting", () => {
    expect(initialSparkSession()).toEqual(RESTING);
  });
});

describe("resting — the only exit is summon", () => {
  test("summon with a fresh candidate goes straight to showing", () => {
    const next = sparkSession(RESTING, { type: "summon", candidate: candidate() });
    expect(next).toEqual({
      status: "showing",
      candidate: candidate(),
      rerollAvailable: true,
    });
  });

  test("summon without a cached candidate goes to summoning", () => {
    expect(sparkSession(RESTING, { type: "summon", candidate: null })).toEqual(SUMMONING);
  });

  test.each<SparkSessionEvent>([
    { type: "candidatesReady", candidate: candidate() },
    { type: "reroll", candidate: candidate() },
    { type: "keystroke" },
    { type: "escape" },
    { type: "sprintEnd" },
    { type: "edit" },
    { type: "failed" },
  ])("stays resting on %o", (event) => {
    expect(sparkSession(RESTING, event)).toEqual(RESTING);
  });
});

describe("summoning — resolves via candidatesReady/failed", () => {
  test("candidatesReady with a candidate shows the card", () => {
    const next = sparkSession(SUMMONING, {
      type: "candidatesReady",
      candidate: candidate("historical"),
    });
    expect(next).toEqual({
      status: "showing",
      candidate: candidate("historical"),
      rerollAvailable: true,
    });
  });

  test("candidatesReady with nothing servable fizzles to spent", () => {
    expect(
      sparkSession(SUMMONING, { type: "candidatesReady", candidate: null }),
    ).toEqual(SPENT);
  });

  test("failed fizzles to spent (no error chrome, affordance rests)", () => {
    expect(sparkSession(SUMMONING, { type: "failed" })).toEqual(SPENT);
  });

  test.each<SparkSessionEvent>([
    { type: "keystroke" },
    { type: "escape" },
    { type: "sprintEnd" },
    { type: "edit" },
  ])("a writer action (%o) while summoning consumes the summon → spent", (event) => {
    expect(sparkSession(SUMMONING, event)).toEqual(SPENT);
  });

  test("summon and reroll are ignored while already summoning", () => {
    expect(sparkSession(SUMMONING, { type: "summon", candidate: candidate() })).toEqual(
      SUMMONING,
    );
    expect(sparkSession(SUMMONING, { type: "reroll", candidate: candidate() })).toEqual(
      SUMMONING,
    );
  });
});

describe("candidatesReady is ignored in every state except summoning", () => {
  const ready: SparkSessionEvent = { type: "candidatesReady", candidate: candidate() };

  test("ignored while resting", () => {
    expect(sparkSession(RESTING, ready)).toEqual(RESTING);
  });

  test("ignored while showing (a late prepare must not swap the card)", () => {
    const showing = sparkSession(RESTING, { type: "summon", candidate: candidate() });
    expect(sparkSession(showing, ready)).toBe(showing);
  });

  test("ignored while spent", () => {
    expect(sparkSession(SPENT, ready)).toEqual(SPENT);
  });

  test("a late candidatesReady after a keystroke cannot resurrect a card", () => {
    const final = run(SUMMONING, [
      { type: "keystroke" }, // writer resumed → spent
      { type: "candidatesReady", candidate: candidate() }, // arrives late → ignored
    ]);
    expect(final).toEqual(SPENT);
  });
});

describe("showing — the card lifecycle", () => {
  const showing = sparkSession(RESTING, { type: "summon", candidate: candidate("economic") });

  test("re-roll is accepted at most once", () => {
    const rerolled = sparkSession(showing, {
      type: "reroll",
      candidate: candidate("historical"),
    });
    expect(rerolled).toEqual({
      status: "showing",
      candidate: candidate("historical"),
      rerollAvailable: false,
    });

    // A second re-roll is a no-op — the one alternative is spent.
    const again = sparkSession(rerolled, {
      type: "reroll",
      candidate: candidate("personal"),
    });
    expect(again).toBe(rerolled);
  });

  test("re-roll with no alternative left drops to spent", () => {
    expect(sparkSession(showing, { type: "reroll", candidate: null })).toEqual(SPENT);
  });

  test.each<SparkSessionEvent>([
    { type: "keystroke" },
    { type: "escape" },
    { type: "sprintEnd" },
    { type: "edit" },
  ])("%o ends the card → spent", (event) => {
    expect(sparkSession(showing, event)).toEqual(SPENT);
  });

  test("keystroke fades the card even after a re-roll", () => {
    const rerolled = sparkSession(showing, {
      type: "reroll",
      candidate: candidate("personal"),
    });
    expect(sparkSession(rerolled, { type: "keystroke" })).toEqual(SPENT);
  });

  test.each<SparkSessionEvent>([
    { type: "summon", candidate: candidate() },
    { type: "failed" },
  ])("%o is ignored while a card is up", (event) => {
    expect(sparkSession(showing, event)).toBe(showing);
  });
});

describe("spent — re-arms only on edit", () => {
  test("edit re-arms to resting (rests until the writer writes again)", () => {
    expect(sparkSession(SPENT, { type: "edit" })).toEqual(RESTING);
  });

  test.each<SparkSessionEvent>([
    { type: "summon", candidate: candidate() },
    { type: "candidatesReady", candidate: candidate() },
    { type: "reroll", candidate: candidate() },
    { type: "keystroke" },
    { type: "escape" },
    { type: "sprintEnd" },
    { type: "failed" },
  ])("%o keeps it spent (a bare keystroke does not re-arm)", (event) => {
    expect(sparkSession(SPENT, event)).toEqual(SPENT);
  });

  test("a summon from spent is refused until an edit re-arms", () => {
    const stillSpent = sparkSession(SPENT, { type: "summon", candidate: candidate() });
    expect(stillSpent).toEqual(SPENT);
    const rearmed = sparkSession(stillSpent, { type: "edit" });
    expect(rearmed).toEqual(RESTING);
    const shown = sparkSession(rearmed, { type: "summon", candidate: candidate() });
    expect(shown.status).toBe("showing");
  });
});

describe("full canonical lifecycle (Journey F)", () => {
  test("resting → summon → showing → keystroke → spent → edit → resting", () => {
    const states: SparkSessionState["status"][] = [];
    let state = initialSparkSession();
    states.push(state.status);

    state = sparkSession(state, { type: "summon", candidate: candidate() });
    states.push(state.status);
    state = sparkSession(state, { type: "keystroke" });
    states.push(state.status);
    state = sparkSession(state, { type: "edit" });
    states.push(state.status);

    expect(states).toEqual(["resting", "showing", "spent", "resting"]);
  });

  test("Journey G: summon → reroll → keystroke lands the second spark", () => {
    let state: SparkSessionState = sparkSession(RESTING, {
      type: "summon",
      candidate: candidate("economic"),
    });
    state = sparkSession(state, { type: "reroll", candidate: candidate("historical") });
    expect(state).toEqual({
      status: "showing",
      candidate: candidate("historical"),
      rerollAvailable: false,
    });
    state = sparkSession(state, { type: "keystroke" });
    expect(state).toEqual(SPENT);
  });
});
