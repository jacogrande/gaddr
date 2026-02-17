"use client";

import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import type {
  InlineComment,
  ReviewIssue,
  SocraticQuestion,
  RubricScore,
  ReviewEvent,
} from "../../../domain/review/review";
import {
  InlineCommentSchema,
  ReviewIssueSchema,
  SocraticQuestionSchema,
  RubricScoreSchema,
  ReviewEventSchema,
} from "../../../domain/review/schemas";

type ReviewStatus = "idle" | "loading" | "done" | "error";

type ReviewState = {
  status: ReviewStatus;
  comments: InlineComment[];
  issues: ReviewIssue[];
  questions: SocraticQuestion[];
  scores: RubricScore[];
  errorMessage: string | null;
};

type StoredReview = Omit<ReviewState, "status"> & { status: "done" | "error" };

const INITIAL_STATE: ReviewState = {
  status: "idle",
  comments: [],
  issues: [],
  questions: [],
  scores: [],
  errorMessage: null,
};

function storageKey(essayId: string): string {
  return `review:${essayId}`;
}

function saveToStorage(essayId: string, state: ReviewState): void {
  if (state.status !== "done" && state.status !== "error") return;
  try {
    const stored: StoredReview = {
      status: state.status,
      comments: state.comments,
      issues: state.issues,
      questions: state.questions,
      scores: state.scores,
      errorMessage: state.errorMessage,
    };
    sessionStorage.setItem(storageKey(essayId), JSON.stringify(stored));
  } catch {
    // Private browsing or quota exceeded — silently ignore
  }
}

function loadFromStorage(essayId: string): ReviewState | null {
  try {
    const raw = sessionStorage.getItem(storageKey(essayId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (obj.status !== "done" && obj.status !== "error") return null;
    const comments = z.array(InlineCommentSchema).safeParse(obj.comments);
    const issues = z.array(ReviewIssueSchema).safeParse(obj.issues);
    const questions = z.array(SocraticQuestionSchema).safeParse(obj.questions);
    const scores = z.array(RubricScoreSchema).safeParse(obj.scores);
    return {
      status: obj.status,
      comments: comments.success ? comments.data : [],
      issues: issues.success ? issues.data : [],
      questions: questions.success ? questions.data : [],
      scores: scores.success ? scores.data : [],
      errorMessage: typeof obj.errorMessage === "string" ? obj.errorMessage : null,
    };
  } catch {
    return null;
  }
}

function removeFromStorage(essayId: string): void {
  try {
    sessionStorage.removeItem(storageKey(essayId));
  } catch {
    // Silently ignore
  }
}

export function useReview(essayId: string) {
  const [state, setState] = useState<ReviewState>(() => {
    return loadFromStorage(essayId) ?? INITIAL_STATE;
  });
  const abortRef = useRef<AbortController | null>(null);
  const essayIdRef = useRef(essayId);
  essayIdRef.current = essayId;

  const setAndPersist = useCallback((updater: (prev: ReviewState) => ReviewState) => {
    setState((prev) => {
      const next = updater(prev);
      saveToStorage(essayIdRef.current, next);
      return next;
    });
  }, []);

  const requestReview = useCallback(async (reqEssayId: string) => {
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
        body: JSON.stringify({ essayId: reqEssayId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        setAndPersist((prev) => ({
          ...prev,
          status: "error",
          errorMessage: text || "Review request failed",
        }));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setAndPersist((prev) => ({
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
              setAndPersist((prev) => ({
                ...prev,
                comments: [...prev.comments, event.data],
              }));
              break;
            case "issue":
              setAndPersist((prev) => ({
                ...prev,
                issues: [...prev.issues, event.data],
              }));
              break;
            case "question":
              setAndPersist((prev) => ({
                ...prev,
                questions: [...prev.questions, event.data],
              }));
              break;
            case "rubric_score":
              setAndPersist((prev) => ({
                ...prev,
                scores: [...prev.scores, event.data],
              }));
              break;
            case "done":
              setAndPersist((prev) => ({ ...prev, status: "done" }));
              break;
            case "error":
              setAndPersist((prev) => ({
                ...prev,
                status: "error",
                errorMessage: event.message,
              }));
              break;
          }
        }
      }

      // If stream ended without a done event, mark as done
      setAndPersist((prev) =>
        prev.status === "loading" ? { ...prev, status: "done" } : prev,
      );
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setAndPersist((prev) => ({
        ...prev,
        status: "error",
        errorMessage: "Review request failed",
      }));
    }
  }, [setAndPersist]);

  const dismiss = useCallback(() => {
    abortRef.current?.abort();
    removeFromStorage(essayIdRef.current);
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    requestReview,
    dismiss,
  };
}
