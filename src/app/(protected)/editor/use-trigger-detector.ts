"use client";

import { useEffect, useRef } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import {
  DEFAULT_TRIGGER_CONFIG,
  createTriggerDetectorState,
  estimateTokens,
  evaluateTrigger,
  type BoundaryType,
  type TriggerConfig,
  type TriggerDetectorState,
  type TriggerReason,
} from "../../../domain/editor/trigger-detector";

const IDLE_TICK_INTERVAL_MS = 500;

const DEBUG_TRIGGERS_ENABLED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DEBUG_TRIGGERS === "true";

export type TriggerObservation = {
  readonly reason: TriggerReason;
  readonly text: string;
  readonly nowMs: number;
  readonly tokenCount: number;
  readonly boundary?: BoundaryType;
  readonly pauseDurationMs?: number;
  readonly thresholdMs?: number;
};

export type TriggerObserver = (observation: TriggerObservation) => void;

/**
 * Phase 3 hook: optionally gate trigger delivery on an async semantic
 * completion check (e.g., "did the writer just finish a complete thought?").
 * Returning `false` suppresses the trigger. Returning `true` (or omitting
 * the check entirely) delivers it.
 *
 * The check should be cheap and bounded; the hook will not retry or back off.
 * If the promise rejects, the trigger is dropped — wrap with try/catch inside
 * the check if that's not what you want.
 */
export type SemanticCompletionCheck = (params: {
  readonly burst: string;
  readonly reason: TriggerReason;
  readonly boundary?: BoundaryType;
}) => Promise<boolean>;

export type UseTriggerDetectorOptions = {
  readonly enabled?: boolean;
  readonly observer?: TriggerObserver;
  /**
   * Pass a stable reference. Inline config objects will cause the underlying
   * listener to re-attach on every render — memoize at the call site.
   */
  readonly config?: TriggerConfig;
  readonly semanticCompletionCheck?: SemanticCompletionCheck;
};

const defaultObserver: TriggerObserver = ({
  reason,
  nowMs,
  tokenCount,
  boundary,
  pauseDurationMs,
  thresholdMs,
  text,
}) => {
  if (!DEBUG_TRIGGERS_ENABLED) {
    return;
  }
  const tail = text.slice(-80).replace(/\s+/g, " ").trim();
  const extras: string[] = [];
  if (boundary !== undefined) extras.push(`boundary=${boundary}`);
  if (pauseDurationMs !== undefined) extras.push(`pause=${String(pauseDurationMs)}ms`);
  if (thresholdMs !== undefined) extras.push(`threshold=${String(thresholdMs)}ms`);
  console.log(
    `[gaddr-trigger] ${reason} · tokens=${String(tokenCount)} · t=${String(nowMs)}${
      extras.length > 0 ? ` · ${extras.join(" · ")}` : ""
    } · tail="${tail}"`,
  );
};

/**
 * Observes the TipTap editor and emits triggers via the observer.
 * No LLM calls yet — observation only. Default observer logs to the console
 * only when NEXT_PUBLIC_DEBUG_TRIGGERS=true.
 *
 * Optionally gates trigger delivery on an async semantic-completion check;
 * see SemanticCompletionCheck.
 */
export function useTriggerDetector(
  editor: TiptapEditor | null,
  {
    enabled = true,
    observer = defaultObserver,
    config = DEFAULT_TRIGGER_CONFIG,
    semanticCompletionCheck,
  }: UseTriggerDetectorOptions = {},
): void {
  const stateRef = useRef<TriggerDetectorState | null>(null);
  const observerRef = useRef(observer);
  observerRef.current = observer;
  const completionCheckRef = useRef(semanticCompletionCheck);
  completionCheckRef.current = semanticCompletionCheck;
  const lastDeliveredTextRef = useRef<string>("");

  useEffect(() => {
    if (!editor || !enabled) {
      return;
    }

    const readText = () => editor.getText({ blockSeparator: "\n\n" });

    stateRef.current = createTriggerDetectorState(Date.now(), readText());
    lastDeliveredTextRef.current = readText();

    const deliver = async (
      observation: TriggerObservation,
      burst: string,
    ): Promise<void> => {
      const check = completionCheckRef.current;
      if (check) {
        try {
          const ok = await check({
            burst,
            reason: observation.reason,
            boundary: observation.boundary,
          });
          if (!ok) return;
        } catch {
          // Completion check failed — drop the trigger silently.
          return;
        }
      }
      observerRef.current(observation);
    };

    const run = () => {
      const previousState = stateRef.current;
      if (!previousState) return;

      const text = readText();
      const nowMs = Date.now();
      const { triggers, nextState } = evaluateTrigger(
        previousState,
        { text, nowMs },
        config,
      );
      stateRef.current = nextState;

      if (triggers.length === 0) return;

      const tokenCount = estimateTokens(text);
      // Burst = everything produced since the last trigger that was delivered.
      const lastDelivered = lastDeliveredTextRef.current;
      const burst = text.startsWith(lastDelivered)
        ? text.slice(lastDelivered.length)
        : text;
      lastDeliveredTextRef.current = text;

      for (const trigger of triggers) {
        void deliver(
          {
            reason: trigger.reason,
            text,
            nowMs,
            tokenCount,
            boundary: trigger.boundary,
            pauseDurationMs: trigger.pauseDurationMs,
            thresholdMs: trigger.thresholdMs,
          },
          burst,
        );
      }
    };

    editor.on("update", run);
    const intervalId = window.setInterval(run, IDLE_TICK_INTERVAL_MS);

    return () => {
      editor.off("update", run);
      window.clearInterval(intervalId);
      stateRef.current = null;
    };
  }, [editor, enabled, config]);
}
