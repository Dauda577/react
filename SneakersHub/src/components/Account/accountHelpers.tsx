// ── Shared helpers for Account tab components ─────────────────────────────────

const IS_MOBILE =
  typeof window !== "undefined" && window.innerWidth < 768;

export const fadeUp = IS_MOBILE
  ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
  : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.22 } };

export const itemVariant = (i: number) =>
  IS_MOBILE
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.12, delay: Math.min(i, 4) * 0.04 } }
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: Math.min(i, 5) * 0.05 } };