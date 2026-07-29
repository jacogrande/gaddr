import { describe, expect, test } from "bun:test";
import {
  isTerminalRunStatus,
  TERMINAL_RUN_STATUSES,
  type RunStatus,
} from "../../../src/domain/constellation/run-types";

describe("isTerminalRunStatus — the lease/staleness decision surface", () => {
  test("complete and failed are terminal; the running states are not", () => {
    expect(isTerminalRunStatus("complete")).toBe(true);
    expect(isTerminalRunStatus("failed")).toBe(true);
    for (const s of ["s1", "s3", "assembling"] as const satisfies readonly RunStatus[]) {
      expect(isTerminalRunStatus(s)).toBe(false);
    }
  });

  test("the terminal set is exactly {complete, failed}", () => {
    expect([...TERMINAL_RUN_STATUSES].sort()).toEqual(["complete", "failed"]);
  });
});
