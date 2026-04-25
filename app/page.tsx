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
        "relative min-h-screen w-full px-6 py-12 transition-all duration-500",
        result ? "lg:pr-[700px]" : "",
      )}
    >
      {/* Header */}
      <div className="mx-auto flex max-w-3xl items-center justify-between border-b border-[var(--color-border)] pb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="grid size-7 place-items-center rounded bg-[var(--color-accent)] text-white">
              <Sparkles className="size-3.5" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold text-[var(--color-fg)] tracking-tight">Musicians Legit</span>
          </div>
          <span className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide">Beta</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--color-muted)] cursor-pointer hover:text-[var(--color-fg)] transition">
            <input
              type="checkbox"
              checked={forceFallback}
              onChange={(e) => setForceFallback(e.target.checked)}
              className="size-3.5 accent-[var(--color-accent)] cursor-pointer"
            />
            <span>Template mode</span>
          </label>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev)] transition"
            aria-label="Settings"
          >
            <Settings className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mx-auto mt-4 max-w-3xl rounded-lg border border-[var(--color-border)] bg-white p-4">
          <label className="block text-xs uppercase tracking-wide text-[var(--color-muted)] font-medium mb-3">
            <KeyRound className="mr-2 inline size-3.5" />
            Bring Your Own Google API Key
          </label>
          <div className="mt-3 flex gap-2">
            <input
              type="password"
              value={byoKey}
              onChange={(e) => rememberKey(e.target.value)}
              placeholder="AIza..."
              className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            {byoKey && (
              <button
                onClick={() => rememberKey("")}
                className="rounded border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev)] transition"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-muted)]">
            Get a free API key at <span className="text-[var(--color-accent)] font-medium">aistudio.google.com/apikey</span>. Your key is stored only in your browser and never logged by us.
          </p>
        </div>
      )}

      {/* Hero / input */}
      <section
        className={cn(
          "mx-auto max-w-3xl",
          isFresh ? "mt-24" : "mt-12",
        )}
      >
        {isFresh && (
          <div className="mb-12 text-center">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-[var(--color-fg)] mb-4">
              Music Contracts,{" "}
              <span className="text-[var(--color-accent)]">
                Instantly Drafted.
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-balance text-base text-[var(--color-muted)] leading-relaxed mb-6">
              Describe your music situation in plain English. Musicians Legit classifies your agreement, asks clarifying questions, and generates a legally-grounded contract in minutes.
            </p>
            <div className="mx-auto max-w-2xl rounded-lg border border-[var(--color-border)] bg-oklch(0.99_0.003_270) p-4 text-sm text-[var(--color-muted)]">
              <p className="leading-relaxed">
                <strong className="text-[var(--color-fg)]">Not legal advice.</strong> These are templates grounded in US music industry conventions. Covers split sheets, producer agreements, sync licenses, gig contracts, and more. Always have a lawyer review before signing.
              </p>
            </div>
          </div>
        )}

        {/* Chat thread */}
        {conversation.length > 0 && (
          <div className="mb-6 space-y-3">
            {conversation.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-[var(--color-accent)] text-white border border-[var(--color-accent)]"
                    : "mr-auto bg-[var(--color-bg-elev)] border border-[var(--color-border)] text-[var(--color-fg)]",
                )}
              >
                {m.content}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="glow-ring">
            <div className="flex items-end gap-3 rounded-lg bg-white p-4">
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
                className="flex-1 resize-none bg-transparent text-base text-[var(--color-fg)] outline-none placeholder:text-[var(--color-muted)]"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded transition-all",
                  input.trim() && !loading
                    ? "bg-[var(--color-accent)] text-white hover:bg-oklch(0.32_0.12_260) active:scale-95"
                    : "bg-[var(--color-border)] text-[var(--color-muted)]",
                )}
                aria-label="Send"
              >
                <Send className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </form>

        {/* Example chips */}
        {isFresh && (
          <div className="mt-8 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setInput(ex)}
                className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg)]"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="mt-8 flex items-center gap-3 text-sm text-[var(--color-muted)]">
            <div className="flex gap-1">
              <span className="size-2 rounded-full bg-[var(--color-accent)] loading-pulse" />
              <span className="size-2 rounded-full bg-[var(--color-accent)] loading-pulse" />
              <span className="size-2 rounded-full bg-[var(--color-accent)] loading-pulse" />
            </div>
            Drafting contract…
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-lg border border-[var(--color-danger)] bg-[oklch(0.96_0.05_25)] px-4 py-3 text-sm text-[var(--color-danger)]">
            <strong className="block mb-1">Error</strong>
            {error}
          </div>
        )}
      </section>

      {/* Footer */}
      {isFresh && (
        <footer className="mx-auto mt-16 max-w-3xl text-center text-[12px] leading-relaxed text-[var(--color-muted)]">
          <div className="border-t border-[var(--color-border)] pt-8">
            <p className="mb-2">
              <strong className="text-[var(--color-fg)]">Disclaimer:</strong> Musicians Legit generates contract templates based on US music industry conventions. These are drafts, not legal advice. Always have a licensed attorney review before signing any agreement.
            </p>
            <p className="text-[11px] text-[var(--color-muted)]">
              Powered by Google Gemini API (free tier) or your own API key. US jurisdiction only.
            </p>
          </div>
        </footer>
      )}

      {result && <ContractView result={result} onClose={() => setResult(null)} />}
    </main>
  );
}
