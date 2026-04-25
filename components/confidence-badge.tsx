"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ConfidenceBreakdown } from "@/lib/ai/confidence";

const LABELS: Record<string, string> = {
  retrieval_quality: "Retrieval quality",
  classification_confidence: "Scenario match",
  field_completeness: "Fields provided",
  clause_review_status: "Lawyer-reviewed clauses",
  jurisdiction_match: "Jurisdiction (US)",
};

export function ConfidenceBadge({ breakdown }: { breakdown: ConfidenceBreakdown }) {
  const [open, setOpen] = useState(false);
  const total = breakdown.weighted_total;
  const tone =
    total >= 0.75 ? "success" : total >= 0.5 ? "warning" : "danger";
  const toneClasses = {
    success: "bg-[oklch(0.30_0.10_145/0.5)] text-[var(--color-success)] border-[oklch(0.55_0.16_145/0.7)]",
    warning: "bg-[oklch(0.32_0.10_75/0.5)] text-[var(--color-warning)] border-[oklch(0.55_0.16_75/0.7)]",
    danger: "bg-[oklch(0.30_0.12_25/0.5)] text-[var(--color-danger)] border-[oklch(0.55_0.20_25/0.7)]",
  }[tone];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:scale-[1.02]",
          toneClasses,
        )}
        aria-expanded={open}
      >
        <span className="size-1.5 rounded-full bg-current" />
        Confidence: {(total * 100).toFixed(0)}%
        <span className="text-[10px] opacity-60">— why?</span>
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 shadow-2xl backdrop-blur"
        >
          <div className="mb-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">
            Confidence breakdown
          </div>
          <ul className="space-y-2 text-sm">
            {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => {
              const v = (breakdown as any)[k] as number;
              const w = (breakdown.weights as any)[k] as number;
              return (
                <li key={k} className="flex items-center justify-between gap-2">
                  <span className="text-[var(--color-fg)]">{LABELS[k]}</span>
                  <span className="text-[var(--color-muted)] tabular-nums">
                    {(v * 100).toFixed(0)}% × {(w * 100).toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
          {breakdown.notes.length > 0 && (
            <div className="mt-3 border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-muted)]">
              {breakdown.notes.map((n, i) => (
                <p key={i} className="mt-1">• {n}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
