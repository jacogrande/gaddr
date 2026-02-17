"use client";

import { useCallback, useRef, useState } from "react";
import type {
  InlineComment,
  ReviewIssue,
  SocraticQuestion,
  RubricScore,
  ReviewEvent,
} from "../../../domain/review/review";
import { ReviewEventSchema } from "../../../domain/review/schemas";

type ReviewStatus = "idle" | "loading" | "done" | "error";

type ReviewState = {
  status: ReviewStatus;
  comments: InlineComment[];
  issues: ReviewIssue[];
  questions: SocraticQuestion[];
  scores: RubricScore[];
  errorMessage: string | null;
};

const INITIAL_STATE: ReviewState = {
  status: "idle",
  comments: [],
  issues: [],
  questions: [],
  scores: [],
  errorMessage: null,
};

export function useReview() {
  const [state, setState] = useState<ReviewState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const requestReview = useCallback(async (essayId: string) => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      status: "loading",
      comments: [],
      issues: [],
      questions: [],
      scores: [],
      errorMessage: null,
    });

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: text || "Review request failed",
        }));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: "No response stream",
        }));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      let readerDone = false;
      while (!readerDone) {
        const { done, value } = await reader.read();
        if (done) {
          readerDone = true;
          continue;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        // Keep incomplete last chunk in buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const json = trimmed.slice(6);

          let raw: unknown;
          try {
            raw = JSON.parse(json);
          } catch {
            continue;
          }

          const validated = ReviewEventSchema.safeParse(raw);
          if (!validated.success) continue;
          const event: ReviewEvent = validated.data;

          switch (event.type) {
            case "inline_comment":
              setState((prev) => ({
                ...prev,
                comments: [...prev.comments, event.data],
              }));
              break;
            case "issue":
              setState((prev) => ({
                ...prev,
                issues: [...prev.issues, event.data],
              }));
              break;
            case "question":
              setState((prev) => ({
                ...prev,
                questions: [...prev.questions, event.data],
              }));
              break;
            case "rubric_score":
              setState((prev) => ({
                ...prev,
                scores: [...prev.scores, event.data],
              }));
              break;
            case "done":
              setState((prev) => ({ ...prev, status: "done" }));
              break;
            case "error":
              setState((prev) => ({
                ...prev,
                status: "error",
                errorMessage: event.message,
              }));
              break;
          }
        }
      }

      // If stream ended without a done event, mark as done
      setState((prev) =>
        prev.status === "loading" ? { ...prev, status: "done" } : prev,
      );
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: "Review request failed",
      }));
    }
  }, []);

  const dismiss = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    requestReview,
    dismiss,
  };
}
