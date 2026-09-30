type HapticKind = "tap" | "selection" | "pickup" | "drop" | "success";

const PATTERNS: Record<HapticKind, number | readonly number[]> = {
  tap: 8,
  selection: 5,
  pickup: 12,
  drop: [10, 28, 12],
  success: [10, 36, 16],
};

let lastFeedbackAt = Number.NEGATIVE_INFINITY;
const MIN_FEEDBACK_INTERVAL_MS = 40;

/** Small, optional vibration cues. Unsupported browsers safely remain silent. */
export function haptic(kind: HapticKind): boolean {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;

  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastFeedbackAt < MIN_FEEDBACK_INTERVAL_MS) return false;
  lastFeedbackAt = now;

  try {
    const pattern = PATTERNS[kind];
    return navigator.vibrate(typeof pattern === "number" ? pattern : [...pattern]);
  } catch {
    return false;
  }
}
