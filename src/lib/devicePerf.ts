export type QualityTier = "low" | "high";

const LOW_POWER_QUERY = "(max-width: 820px), (pointer: coarse)";

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isLowPowerViewport() {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return true;
  return window.matchMedia(LOW_POWER_QUERY).matches;
}

export function detectQualityTier(): QualityTier {
  return isLowPowerViewport() ? "low" : "high";
}

export function cappedPixelRatio(max: number) {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, max);
}
