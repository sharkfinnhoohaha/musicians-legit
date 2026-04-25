"use client";

import { useMemo, useState } from "react";
import type { GeneratedContract } from "@/lib/ai/generate";
import type { ConfidenceBreakdown } from "@/lib/ai/confidence";
import { ConfidenceBadge } from "./confidence-badge";
import { Info, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ContractResult = {
  contractId: string | null;
  contract: GeneratedContract;
  markdown: string;
  confidence: ConfidenceBreakdown;
  archetype: string;
  usedFallback: boolean;
  modelUsed: string;
};

export function ContractView({ result, onClose }: { result: ContractResult; onClose: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  const sections = useMemo(() => result.contract.sections, [result.contract.sections]);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    if (result.contractId) {
      fetch("/api/contract/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contractId: result.contractId, wasCopied: true }),
      }).catch(() => {});
    }
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <aside className="fixed right-0 top-0 z-20 flex h-full w-full max-w-[680px] flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elev)] shadow-[0_0_60px_oklch(0_0_0/0.4)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-medium">{result.contract.contract_title}</h2>
          {result.usedFallback && (
            <span className="rounded-md bg-[oklch(0.30_0.05_270/0.6)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Template mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge breakdown={result.confidence} />
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scroll-fade px-6 py-6">
        <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm leading-relaxed text-[var(--color-fg)]">
          <span className="mb-1 block text-xs uppercase tracking-wide text-[var(--color-muted)]">
            Plain-English summary
          </span>
          {result.contract.plain_english_summary}
        </p>

        <div className="mt-6">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">Parties</h3>
          <ul className="space-y-1 text-sm">
            {result.contract.parties.map((p, i) => (
              <li key={i}>
                <span className="font-medium">{p.role}:</span> {p.name}
                {p.details && <span className="text-[var(--color-muted)]"> — {p.details}</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="prose-contract mt-6">
          {sections.map((s, i) => (
            <section key={i} className="border-t border-[var(--color-border)] pt-4">
              <div className="flex items-start justify-between gap-3">
                <h2>{s.heading}</h2>
                <NoteTooltip note={s.notes_for_user} />
              </div>
              <div dangerouslySetInnerHTML={{ __html: simpleMarkdown(s.body_markdown) }} />
            </section>
          ))}
        </div>

        {result.contract.open_questions_for_user.length > 0 && (
          <div className="mt-6 rounded-xl border border-[oklch(0.40_0.10_75/0.4)] bg-[oklch(0.30_0.10_75/0.10)] p-4">
            <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--color-warning)]">
              Open Questions
            </h3>
            <ul className="space-y-1 text-sm">
              {result.contract.open_questions_for_user.map((q, i) => (
                <li key={i}>• {q}</li>
              ))}
            </ul>
          </div>
        )}

        {result.contract.recommended_next_steps.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">
              Recommended next steps
            </h3>
            <ul className="space-y-1 text-sm">
              {result.contract.recommended_next_steps.map((q, i) => (
                <li key={i}>• {q}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="border-t border-[var(--color-border)] px-6 py-4">
        <label className="mb-3 flex items-start gap-3 text-xs leading-relaxed text-[var(--color-muted)]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 size-4 rounded border-[var(--color-border)] bg-transparent accent-[var(--color-accent)]"
          />
          <span>
            I have read this entire DRAFT and understand it is{" "}
            <strong className="text-[var(--color-fg)]">not legal advice</strong>. This tool produces drafts based on
            common US music-industry conventions. Musicians Legit and its operators are not liable for any errors or
            outcomes. For high-stakes deals, have a music attorney review.
          </span>
        </label>
        <div className="flex items-center gap-2">
          <button
            disabled={!acknowledged}
            onClick={copyMarkdown}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3.5 py-2 text-sm font-medium transition",
              acknowledged
                ? "bg-[var(--color-fg)] text-[var(--color-bg)] hover:scale-[1.02]"
                : "cursor-not-allowed text-[var(--color-muted)]",
            )}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy as Markdown"}
          </button>
          <span className="text-[10px] text-[var(--color-muted)]">
            Model: {result.modelUsed} · {result.archetype}
          </span>
        </div>
      </footer>
    </aside>
  );
}

function NoteTooltip({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        type="button"
        className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        aria-label="Why is this clause here?"
      >
        <Info className="size-4" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute right-0 z-10 mt-1 w-64 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs leading-relaxed text-[var(--color-muted)] shadow-lg"
        >
          {note}
        </span>
      )}
    </span>
  );
}

// Tiny markdown subset → HTML (just enough for clause bodies, no XSS risk vectors used)
function simpleMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = escape(md);
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\{\{(\w+)\}\}/g, '<code class="text-[var(--color-warning)]">{{$1}}</code>');
  html = html.replace(/\n\n/g, "</p><p>");
  return `<p>${html}</p>`;
}
