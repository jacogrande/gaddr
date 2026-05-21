"use client";

import { useEffect, useRef } from "react";

export type WizardMode = "hidden" | "transition_in" | "visible" | "transition_out";

export type WizardOption = {
  readonly id: string;
  readonly durationMs: number;
};

type FreewriteWizardProps = {
  readonly mode: Exclude<WizardMode, "hidden">;
  readonly options: readonly WizardOption[];
  readonly onSelect: (optionId: string) => void;
};

function formatDuration(durationMs: number): { value: string; unit: string } {
  if (durationMs < 60_000) {
    return { value: String(Math.round(durationMs / 1000)), unit: "sec" };
  }
  return { value: String(Math.round(durationMs / 60_000)), unit: "min" };
}

export function FreewriteWizard({ mode, options, onSelect }: FreewriteWizardProps) {
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);
  const isExiting = mode === "transition_out";
  const isEntering = mode === "transition_in";

  useEffect(() => {
    if (mode === "transition_in" || mode === "visible") {
      const timeoutId = window.setTimeout(() => {
        firstButtonRef.current?.focus();
      }, 80);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [mode]);

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-label="Choose a freewrite duration"
      data-testid="freewrite-wizard"
      data-mode={mode}
      className={`fixed inset-0 z-[80] flex flex-col items-center justify-center gap-14 bg-[color:var(--app-bg)] transition-all duration-500 ease-out ${
        isExiting ? "pointer-events-none opacity-0 [transform:scale(0.985)]" : "opacity-100"
      }`}
    >
      <p
        className={`text-[0.7rem] font-light uppercase tracking-[0.32em] text-[color:var(--app-muted-soft)] ${
          isEntering
            ? "animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-700 [animation-delay:80ms]"
            : ""
        }`}
      >
        How long will you write?
      </p>

      <div className="flex items-baseline gap-8 sm:gap-12 md:gap-16">
        {options.map((option, index) => {
          const { value, unit } = formatDuration(option.durationMs);
          return (
            <button
              key={option.id}
              ref={index === 0 ? firstButtonRef : undefined}
              type="button"
              data-testid={`wizard-option-${option.id}`}
              disabled={isExiting}
              onClick={() => {
                onSelect(option.id);
              }}
              className={`gaddr-wizard-option group flex cursor-pointer flex-col items-center rounded-md px-3 py-2 outline-none transition-transform duration-300 ease-out hover:scale-[1.07] focus-visible:scale-[1.07] active:scale-[0.97] disabled:cursor-default ${
                isEntering
                  ? "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-700"
                  : ""
              }`}
              style={
                isEntering
                  ? { animationDelay: `${String(220 + index * 80)}ms` }
                  : undefined
              }
            >
              <span className="text-[3.25rem] font-extralight leading-none tabular-nums text-[color:var(--app-fg)] transition-colors duration-300 group-hover:text-[color:var(--accent-strong)] group-focus-visible:text-[color:var(--accent-strong)]">
                {value}
              </span>
              <span className="mt-2 text-[0.6rem] uppercase tracking-[0.24em] text-[color:var(--app-muted-soft)] transition-colors duration-300 group-hover:text-[color:var(--app-muted)] group-focus-visible:text-[color:var(--app-muted)]">
                {unit}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
