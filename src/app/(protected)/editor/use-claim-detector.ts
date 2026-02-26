"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DetectedClaim } from "../../../domain/claims/claim";
import { ClaimDetectionResultSchema } from "../../../domain/claims/schemas";
import { MIN_WORDS_FOR_DETECTION, countWords } from "../../../domain/claims/pipeline";

type ClaimDetectorStatus = "idle" | "detecting" | "done" | "error";

const DEBOUNCE_MS = 3000;

export function useClaimDetector(essayId: string) {
  const [claims, setClaims] = useState<readonly DetectedClaim[]>([]);
  const [status, setStatus] = useState<ClaimDetectorStatus>("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Track last *successfully detected* text so failed detections can retry
  const lastDetectedTextRef = useRef<string>("");

  const detect = useCallback(
    async (essayText: string, signal: AbortSignal) => {
      setStatus("detecting");

      try {
        const res = await fetch("/api/claims/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ essayId, essayText }),
          signal,
        });

        if (signal.aborted) return;

        if (!res.ok) {
          setStatus("error");
          return;
        }

        const json: unknown = await res.json();
        const parsed = ClaimDetectionResultSchema.safeParse(json);

        if (!parsed.success) {
          setStatus("error");
          return;
        }

        lastDetectedTextRef.current = essayText;
        setClaims(parsed.data.claims);
        setStatus("done");
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setStatus("error");
      }
    },
    [essayId],
  );

  const scheduleDetection = useCallback(
    (essayText: string) => {
      // Skip if text unchanged from last successful detection
      if (essayText === lastDetectedTextRef.current) return;

      // Skip if below minimum word count
      if (countWords(essayText) < MIN_WORDS_FOR_DETECTION) return;

      // Cancel pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Cancel in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }

      debounceRef.current = setTimeout(() => {
        const controller = new AbortController();
        abortRef.current = controller;
        void detect(essayText, controller.signal);
      }, DEBOUNCE_MS);
    },
    [detect],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { claims, status, scheduleDetection } as const;
}
