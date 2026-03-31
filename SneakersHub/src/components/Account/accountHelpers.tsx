// ── Shared helpers for Account tab components ─────────────────────────────────

// Detect mobile ONCE at module level — never recalculated per render
export const IS_MOBILE =
  typeof window !== "undefined" && window.innerWidth < 768;

// Mobile: opacity only. Desktop: opacity + y.
export const fadeUp = IS_MOBILE
  ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
  : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.22 } };

// Per-list-item animation — stagger capped at 5 to prevent lag on long lists
export const itemVariant = (i: number) =>
  IS_MOBILE
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.12, delay: Math.min(i, 4) * 0.04 } }
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: Math.min(i, 5) * 0.05 } };

export const formatOrderId = (id: string) => {
  const num = parseInt(id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
  return `#${num.toString().padStart(9, "0")}`;
};

export const statusColors: Record<string, string> = {
  pending:   "bg-yellow-500/10 text-yellow-600",
  shipped:   "bg-purple-500/10 text-purple-600",
  delivered: "bg-green-500/10 text-green-600",
};