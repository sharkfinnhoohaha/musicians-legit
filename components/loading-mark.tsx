/**
 * LoadingMark — "Score → Contract"
 *
 * A custom SVG loader that draws five musical staff lines from left to right,
 * then morphs them into stacked contract-paragraph rules. A small brass cursor
 * pulses at the end. Designed as a brand mark for the act of drafting.
 *
 * All animation lives in globals.css so it respects prefers-reduced-motion.
 */
export function LoadingMark({
  size = 64,
  label,
}: {
  size?: number;
  label?: string;
}) {
  return (
    <div
      className="inline-flex flex-col items-center justify-center gap-3"
      role="status"
      aria-label={label ?? "Drafting"}
    >
      <svg
        className="ml-loader-svg"
        width={size * 2}
        height={size}
        viewBox="0 0 240 120"
        fill="none"
        aria-hidden
      >
        {/* Staff lines that draw, then fade as blocks emerge */}
        <line className="staff" x1="20" y1="20" x2="220" y2="20" />
        <line className="staff" x1="20" y1="34" x2="220" y2="34" />
        <line className="staff" x1="20" y1="48" x2="220" y2="48" />
        <line className="staff" x1="20" y1="62" x2="220" y2="62" />
        <line className="staff" x1="20" y1="76" x2="220" y2="76" />

        {/* Contract paragraph blocks that emerge after the staff draws */}
        <rect className="block" x="20" y="92" width="120" height="2.5" />
        <rect className="block" x="20" y="100" width="180" height="2.5" />
        <rect className="block" x="20" y="108" width="90" height="2.5" />
        <rect className="block" x="120" y="108" width="60" height="2.5" />
        <rect className="block" x="20" y="116" width="150" height="2.5" />

        {/* Brass blinking cursor at end of last line */}
        <rect className="cursor" x="172" y="115" width="6" height="3" />
      </svg>
      {label && (
        <p className="mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-muted)]">
          {label}
        </p>
      )}
    </div>
  );
}
