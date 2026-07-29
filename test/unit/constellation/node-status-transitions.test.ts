/**
 * Unit table for the D12 node lifecycle helpers (`node-types.ts`):
 * `canTransitionStatus`, `statusPredecessors`, and their mutual consistency.
 * `statusPredecessors` is what the PATCH route hands the persistence layer to
 * enforce transition legality ATOMICALLY, so it must be the exact inverse of the
 * forward map — a drift would let an illegal transition through or block a legal
 * one.
 */

import { describe, expect, test } from "bun:test";
import {
  canTransitionStatus,
  NODE_STATUSES,
  statusPredecessors,
} from "../../../src/domain/constellation/node-types";

describe("statusPredecessors", () => {
  test("opened is reached only from unseen", () => {
    expect(statusPredecessors("opened")).toEqual(["unseen"]);
  });

  test("the terminal moves are reached only from opened", () => {
    expect(statusPredecessors("resolved")).toEqual(["opened"]);
    expect(statusPredecessors("dismissed")).toEqual(["opened"]);
    expect(statusPredecessors("deferred")).toEqual(["opened"]);
  });

  test("unseen is unreachable — nothing transitions INTO it (empty set)", () => {
    // An empty predecessor set makes the PATCH a guaranteed no-op — the correct
    // outcome for a client that requests the initial state as a target.
    expect(statusPredecessors("unseen")).toEqual([]);
  });
});

describe("statusPredecessors is the exact inverse of canTransitionStatus", () => {
  test("for every (from, to): predecessor membership ⟺ transition legality", () => {
    for (const from of NODE_STATUSES) {
      for (const to of NODE_STATUSES) {
        expect(statusPredecessors(to).includes(from)).toBe(
          canTransitionStatus(from, to),
        );
      }
    }
  });
});
