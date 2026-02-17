"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_DURATION = 600; // 10 minutes
const LS_KEY = "sprint-timer-duration";

function getStoredDuration(): number {
  if (typeof window === "undefined") return DEFAULT_DURATION;
  const stored = localStorage.getItem(LS_KEY);
  if (!stored) return DEFAULT_DURATION;
  const parsed = parseInt(stored, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DURATION;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SprintTimer() {
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load stored duration on mount
  useEffect(() => {
    const stored = getStoredDuration();
    setDuration(stored);
    setSecondsLeft(stored);
    setHydrated(true);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    setIsRunning(true);
    setIsFinished(false);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRunning(false);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const pause = useCallback(() => {
    stop();
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setSecondsLeft(duration);
    setIsFinished(false);
  }, [stop, duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    setSecondsLeft(newDuration);
    setIsFinished(false);
    localStorage.setItem(LS_KEY, String(newDuration));
    stop();
  };

  // Don't render until client-side hydration completes (avoids flash of default duration)
  if (!hydrated) return null;

  // Not started yet — show a compact start button
  if (!isRunning && secondsLeft === duration && !isFinished) {
    return (
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={start}
          className="text-sm font-medium text-stone-400 hover:text-stone-600 transition-colors"
        >
          Start sprint timer ({formatTime(duration)})
        </button>
        <select
          value={duration}
          onChange={(e) => { handleDurationChange(Number(e.target.value)); }}
          className="border-0 bg-transparent text-xs text-stone-400 focus:outline-none cursor-pointer"
        >
          <option value={300}>5 min</option>
          <option value={600}>10 min</option>
          <option value={900}>15 min</option>
          <option value={1200}>20 min</option>
        </select>
      </div>
    );
  }

  return (
    <div className={`mb-4 flex items-center gap-3 ${isFinished ? "animate-pulse" : ""}`}>
      <span className={`font-mono text-sm font-bold tabular-nums ${isFinished ? "text-[#B74134]" : "text-stone-600"}`}>
        {formatTime(secondsLeft)}
      </span>
      {isFinished ? (
        <span className="text-sm text-[#B74134] font-medium">
          Time&apos;s up — wrap up your thoughts
        </span>
      ) : null}
      <div className="flex items-center gap-1.5">
        {isRunning ? (
          <button
            type="button"
            onClick={pause}
            className="text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors"
          >
            Resume
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          className="text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
