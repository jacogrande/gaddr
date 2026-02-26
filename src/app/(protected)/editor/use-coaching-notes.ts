"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DetectedClaim } from "../../../domain/claims/claim";
import type { CoachingNote } from "../../../domain/coaching/coaching";
import { CoachingResultSchema } from "../../../domain/coaching/schemas";
import { coachingNoteKey } from "../../../domain/coaching/pipeline";

type CoachingStatus = "idle" | "coaching" | "done" | "error";

export function useCoachingNotes(essayId: string) {
  const [allNotes, setAllNotes] = useState<readonly CoachingNote[]>([]);
  const [status, setStatus] = useState<CoachingStatus>("idle");

  const abortRef = useRef<AbortController | null>(null);
  const lastCoachedTextRef = useRef<string>("");
  const dismissedKeysRef = useRef<Set<string>>(new Set());

  const requestCoaching = useCallback(
    async (essayText: string, claims: readonly DetectedClaim[]) => {
      // Skip if text unchanged from last successful coaching
      if (essayText === lastCoachedTextRef.current) return;

      // Cancel in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("coaching");

      try {
        const res = await fetch("/api/coaching/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ essayId, essayText, claims }),
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!res.ok) {
          setStatus("error");
          return;
        }

        const json: unknown = await res.json();
        const parsed = CoachingResultSchema.safeParse(json);

        if (!parsed.success) {
          setStatus("error");
          return;
        }

        lastCoachedTextRef.current = essayText;
        // Clear dismissed set on fresh results
        dismissedKeysRef.current = new Set();
        setAllNotes(parsed.data.notes);
        setStatus("done");
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setStatus("error");
      }
    },
    [essayId],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const dismissNote = useCallback((note: CoachingNote) => {
    const key = coachingNoteKey(note);
    dismissedKeysRef.current.add(key);
    setAllNotes((prev) => prev.filter((n) => coachingNoteKey(n) !== key));
  }, []);

  return { notes: allNotes, status, requestCoaching, dismissNote } as const;
}
