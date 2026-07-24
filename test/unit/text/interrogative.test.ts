/**
 * A direct anchor for the shared interrogative primitive (extracted from
 * validate-spark.ts, plan §8 step 2). The spark suite is the behaviour-identity
 * proof; this file pins the module's own contract so a future consumer (the
 * constellation question-node validator) sees the guarantees documented in one
 * place.
 */
import { describe, expect, test } from "bun:test";
import { opensInterrogativeMood } from "../../../src/domain/text/interrogative";

describe("opensInterrogativeMood", () => {
  test.each([
    "What replaced the workshop?",
    "Why did repair culture fade?",
    "Is scale really free of cost?",
    "Isn't demand the real driver?",
    "For whom did prices actually fall?",
    "So what about the makers?",
    "In an age of factories, what happened to repair?",
  ])("accepts a genuine question: %s", (question) => {
    expect(opensInterrogativeMood(question)).toBe(true);
  });

  test.each([
    "Craftsmanship declined, but what replaced it?",
    "Scale is free, so who pays the cost?",
    "Painting sells well, but what about sculpture?",
    "Everything is disposable now, who benefits?",
  ])("rejects a declarative preamble: %s", (question) => {
    expect(opensInterrogativeMood(question)).toBe(false);
  });
});
