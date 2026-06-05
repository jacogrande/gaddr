/**
 * Tiny gated console logger for watching the background-inference pipeline in
 * dev. Shares the NEXT_PUBLIC_DEBUG_TRIGGERS flag with the trigger detector and
 * the substrate debug panel, so one flag lights up the whole observability
 * story: triggers firing -> adapters classifying -> runner routing -> substrate
 * updating.
 *
 * Infra-only. Domain must never log (it stays pure); this lives at the boundary
 * where side effects are allowed.
 */

export const DEBUG_INFERENCE_ENABLED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DEBUG_TRIGGERS === "true";

export function inferenceLog(scope: string, message: string): void {
  if (!DEBUG_INFERENCE_ENABLED) return;
  console.log(`[gaddr:${scope}] ${message}`);
}

/** Short, single-line preview of a burst for log readability. */
export function previewText(text: string, max = 48): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max - 1)}…`;
}
