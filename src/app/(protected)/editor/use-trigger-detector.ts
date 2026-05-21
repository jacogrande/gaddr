"use client";

import { useEffect, useRef } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import {
  DEFAULT_TRIGGER_CONFIG,
  createTriggerDetectorState,
  estimateTokens,
  evaluateTrigger,
  type TriggerConfig,
  type TriggerDetectorState,
  type TriggerReason,
} from "../../../domain/editor/trigger-detector";

const IDLE_TICK_INTERVAL_MS = 500;

export type TriggerObservation = {
  readonly reason: TriggerReason;
  readonly text: string;
  readonly nowMs: number;
  readonly tokenCount: number;
};

export type TriggerObserver = (observation: TriggerObservation) => void;

const defaultObserver: TriggerObserver = ({ reason, nowMs, tokenCount, text }) => {
  const tail = text.slice(-80).replace(/\s+/g, " ").trim();
  console.log(
    `[gaddr-trigger] ${reason} · tokens=${String(tokenCount)} · t=${String(nowMs)} · tail="${tail}"`,
  );
};

/**
 * Observes the TipTap editor and emits triggers via the observer.
 * No LLM calls yet — observation only. Default observer logs to console.
 */
export function useTriggerDetector(
  editor: TiptapEditor | null,
  observer: TriggerObserver = defaultObserver,
  config: TriggerConfig = DEFAULT_TRIGGER_CONFIG,
): void {
  const stateRef = useRef<TriggerDetectorState | null>(null);
  const observerRef = useRef(observer);
  observerRef.current = observer;

  useEffect(() => {
    if (!editor) {
      return;
    }

    const readText = () => editor.getText({ blockSeparator: "\n\n" });

    stateRef.current = createTriggerDetectorState(Date.now(), readText());

    const run = () => {
      const previousState = stateRef.current;
      if (!previousState) {
        return;
      }

      const text = readText();
      const nowMs = Date.now();
      const { triggers, nextState } = evaluateTrigger(
        previousState,
        { text, nowMs },
        config,
      );
      stateRef.current = nextState;

      if (triggers.length === 0) {
        return;
      }

      const tokenCount = estimateTokens(text);
      for (const reason of triggers) {
        observerRef.current({ reason, text, nowMs, tokenCount });
      }
    };

    editor.on("update", run);
    const intervalId = window.setInterval(run, IDLE_TICK_INTERVAL_MS);

    return () => {
      editor.off("update", run);
      window.clearInterval(intervalId);
      stateRef.current = null;
    };
  }, [editor, config]);
}
