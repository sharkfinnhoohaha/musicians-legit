"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, KeyRound, Settings } from "lucide-react";
import { ContractView, type ContractResult } from "@/components/contract-view";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const EXAMPLES = [
  "My friend produced a beat for me — what do we put on paper for splits before I release it?",
  "I'm hiring a session drummer for $300/day. He says he's flat fee, no royalty. Need a quick agreement.",
  "We're 4 in a band, never papered who owns the name. One member is moving to LA — what do we do?",
  "Writing a song with someone over Zoom. They want to hear it before signing anything. NDA?",
  "Venue wants me to play next month — they're pushing pay-to-play. What protects me?",
  "A YouTuber wants to use my instrumental. They have no budget. Sync agreement?",
];

function randomSessionId() {
  return crypto.randomUUID?.() ?? `s-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export default function HomePage() {
  const [input, setInput] = useState("");
  const [conversation, setConversation] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContractResult | null>(null);
  const [forceFallback, setForceFallback] = useState(false);
  const [byoKey, setByoKey] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const sessionIdRef = useRef<string>("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    sessionIdRef.current = randomSessionId();
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("byo_google_key") : null;
    if (stored) setByoKey(stored);
  }, []);

  function rememberKey(key: string) {
    setByoKey(key);
    if (typeof window !== "undefined") {
      if (key) window.localStorage.setItem("byo_google_key", key);
      else window.localStorage.removeItem("byo_google_key");
    }
  }

  async function submit(text: string, conversationLog: Msg[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contract/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(byoKey ? { "x-byo-google-key": byoKey } : {}),
        },
        body: JSON.stringify({
          scenarioText: text,
          conversationLog,
          forceFallback,
          sessionId: sessionIdRef.current,
        }),
      });
      if (res.status === 429) {
        const j = await res.json();
        throw new Error(j.message || "Daily limit reached.");
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status})`);
      }
      const j = await res.json();
      if (j.kind === "followup") {
        setConversation((c) => [...c, { role: "assistant", content: j.question }]);
      } else {
        setResult(j as ContractResult);
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    const newConv: Msg[] = [...conversation, { role: "user", content: text }];
    setConversation(newConv);
    // Build the scenario string: first user msg + any subsequent answers
    const scenarioText = newConv
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");
    await submit(scenarioText, newConv);
  }

  const isFresh = conversation.length === 0 && !result && !loading && !error;

  return (
    <main
      className={cn(
        "relative min-h-screen w-full px-6 py-10 transition-all duration-500",
        result ? "lg:pr-[700px]" : "",
      )}
    >
      {/* Header */}
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] text-[var(--color-bg)]">
            <Sparkles className="size-4" />
          </div>
          <span className="text-sm font-medium tracking-tight">Musicians Legit</span>
          <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
            Beta · US only
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <input
              type="checkbox"
              checked={forceFallback}
              onChange={(e) => setForceFallback(e.target.checked)}
              className="size-3.5 accent-[var(--color-accent)]"
            />
            Template mode (no AI)
          </label>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="rounded-md p-1.5 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            aria-label="Settings"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mx-auto mt-4 max-w-3xl rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
          <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <KeyRound className="mr-1 inline size-3.5" />
            Bring your own Google AI Studio key (free at aistudio.google.com/apikey)
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              value={byoKey}
              onChange={(e) => rememberKey(e.target.value)}
              placeholder="AIza..."
              className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
            {byoKey && (
              <button
                onClick={() => rememberKey("")}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)]"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-muted)]">
            Stored only in your browser. Sent on each request as a header. We never log your key.
          </p>
        </div>
      )}

      {/* Hero / input */}
      <section
        className={cn(
          "mx-auto max-w-3xl",
          isFresh ? "mt-32" : "mt-10",
        )}
      >
        {isFresh && (
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-fg)] sm:text-5xl">
              Music contracts,{" "}
              <span className="bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text text-transparent">
                drafted from a sentence.
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-balance text-sm text-[var(--color-muted)]">
              Describe your situation. We'll classify it, ask any missing details, and draft a contract grounded in
              real US music-industry conventions. Read the whole thing before signing — this is a draft, not legal
              advice.
            </p>
          </div>
        )}

        {/* Chat thread */}
        {conversation.length > 0 && (
          <div className="mb-4 space-y-3">
            {conversation.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-[var(--color-bg-elev)] border border-[var(--color-border)]"
                    : "mr-auto border border-[var(--color-border)] bg-[oklch(0.20_0.02_290/0.6)]",
                )}
              >
                {m.content}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="glow-ring">
            <div className="flex items-end gap-2 rounded-[calc(1.25rem-1px)] bg-[var(--color-bg-elev)] p-3">
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit(e as any);
                  }
                }}
                rows={isFresh ? 3 : 2}
                placeholder={
                  conversation.length > 0
                    ? "Answer the question, or add more detail…"
                    : "Describe your situation in plain English…"
                }
                className="flex-1 resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-[var(--color-muted)]"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl transition",
                  input.trim() && !loading
                    ? "bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] text-[var(--color-bg)] hover:scale-[1.04]"
                    : "bg-[var(--color-bg)] text-[var(--color-muted)]",
                )}
                aria-label="Send"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Example chips */}
        {isFresh && (
          <div className="mt-6 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setInput(ex)}
                className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="mt-6 flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <span className="size-2 animate-pulse rounded-full bg-[var(--color-accent)]" />
            Drafting…
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-lg border border-[oklch(0.40_0.20_25/0.5)] bg-[oklch(0.20_0.10_25/0.3)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}
      </section>

      {/* Footer */}
      {isFresh && (
        <footer className="mx-auto mt-24 max-w-3xl text-center text-[11px] leading-relaxed text-[var(--color-muted)]">
          Not legal advice. Drafts only. US jurisdiction. Powered by Google Gemini (free tier) or your own key.
        </footer>
      )}

      {result && <ContractView result={result} onClose={() => setResult(null)} />}
    </main>
  );
}
