"use client";

import { useEffect, useRef, useState } from "react";
import { Send, KeyRound, Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ContractView, type ContractResult } from "@/components/contract-view";
import { LoadingMark } from "@/components/loading-mark";
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

export default function DemoPage() {
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
        "relative min-h-[calc(100vh-64px)] w-full px-6 lg:px-10 py-12",
        result ? "lg:pr-[700px]" : "",
      )}
    >
      <div className="mx-auto max-w-3xl">
        {/* Demo chrome */}
        <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="mono text-[11px] tracking-[0.16em] text-[var(--color-muted)] uppercase hover:text-[var(--color-ink)] inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3" strokeWidth={1.6} />
              Back
            </Link>
            <span className="mono text-[10px] tracking-[0.22em] text-[var(--color-muted-2)] uppercase">
              File 02 / Live demo
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[12px] text-[var(--color-muted)] cursor-pointer hover:text-[var(--color-ink)] transition">
              <input
                type="checkbox"
                checked={forceFallback}
                onChange={(e) => setForceFallback(e.target.checked)}
                className="size-3.5 accent-[var(--color-ink)] cursor-pointer"
              />
              <span>Template mode</span>
            </label>
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="rounded-none p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition"
              aria-label="Settings"
            >
              <Settings className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="mt-4 border border-[var(--color-hairline)] bg-[var(--color-card)] p-4">
            <label className="mono block text-[10px] tracking-[0.22em] uppercase text-[var(--color-muted)] mb-3">
              <KeyRound className="mr-2 inline size-3" />
              Bring Your Own Google API Key
            </label>
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                value={byoKey}
                onChange={(e) => rememberKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-[13px] text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
              />
              {byoKey && (
                <button
                  onClick={() => rememberKey("")}
                  className="border border-[var(--color-hairline)] px-3 py-2 text-[13px] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-[var(--color-muted)]">
              Get a free key at{" "}
              <span className="text-[var(--color-marine)] font-medium">
                aistudio.google.com/apikey
              </span>
              . Stored only in your browser.
            </p>
          </div>
        )}

        {/* Hero */}
        <section className={cn(isFresh ? "mt-20" : "mt-10")}>
          {isFresh && (
            <div className="mb-12">
              <p className="section-tag mb-6">Live · Public beta</p>
              <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)] tracking-tight">
                Describe the deal.
                <br />
                <em>Get a draft.</em>
              </h1>
              <p className="mt-6 max-w-xl text-[15px] leading-[1.65] text-[var(--color-muted)]">
                Plain English in. A structured, grounded contract out — with a
                transparent confidence score and clause-by-clause provenance.{" "}
                <strong className="text-[var(--color-ink)] font-medium">
                  Not legal advice.
                </strong>{" "}
                Have an attorney review before signing.
              </p>
            </div>
          )}

          {/* Conversation thread */}
          {conversation.length > 0 && (
            <div className="mb-6 space-y-3">
              {conversation.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[80%] border px-4 py-3 text-[14px] leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]"
                      : "mr-auto bg-[var(--color-card)] border-[var(--color-hairline)] text-[var(--color-ink)]",
                  )}
                >
                  {m.content}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className="border border-[var(--color-ink)] bg-[var(--color-card)] focus-within:shadow-[4px_4px_0_var(--color-ink)] focus-within:-translate-x-px focus-within:-translate-y-px transition-all">
              <div className="flex items-end gap-3 p-4">
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
                  className="flex-1 resize-none bg-transparent text-[15px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted-2)]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className={cn(
                    "grid size-10 shrink-0 place-items-center transition-all",
                    input.trim() && !loading
                      ? "bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-marine)]"
                      : "bg-[var(--color-hairline)] text-[var(--color-muted-2)]",
                  )}
                  aria-label="Send"
                >
                  <Send className="size-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          </form>

          {/* Examples */}
          {isFresh && (
            <div className="mt-10">
              <p className="mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-muted-2)] mb-4">
                Try a starter scenario
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setInput(ex)}
                    className="border border-[var(--color-hairline)] bg-[var(--color-card)] px-4 py-2 text-[12px] text-[var(--color-muted)] transition hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="mt-12 flex flex-col items-center gap-3">
              <LoadingMark size={72} label="Drafting · classifying · retrieving" />
            </div>
          )}
          {error && (
            <div className="mt-6 border border-[var(--color-danger)] bg-[oklch(0.96_0.05_25)] px-4 py-3 text-[13px] text-[var(--color-danger)]">
              <strong className="block mb-1">Error</strong>
              {error}
            </div>
          )}
        </section>
      </div>

      {result && <ContractView result={result} onClose={() => setResult(null)} />}
    </main>
  );
}
