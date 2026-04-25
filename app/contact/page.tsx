"use client";

import { useState } from "react";
import { Mail, Send, Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TOPICS = [
  "General question",
  "Bug report",
  "I’m a music attorney",
  "Press / media",
  "Partnership",
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading") return;
    if (!email.trim() || !message.trim()) {
      setState("error");
      setFeedback("Email and message are required.");
      return;
    }
    setState("loading");
    setFeedback(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, topic, message }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status})`);
      }
      setState("ok");
      setFeedback("Got it. We respond within 1–2 business days.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      setState("error");
      setFeedback(err.message ?? "Something went wrong.");
    }
  }

  return (
    <main className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] hairline-grid opacity-30"
      />

      <section className="relative pt-20 lg:pt-32">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-3">
              <p className="section-tag">04 — Contact</p>
            </div>
            <div className="lg:col-span-9">
              <h1 className="display text-[clamp(2.5rem,6vw,5rem)]">
                Tell us
                <br />
                <em>what you need.</em>
              </h1>
              <p className="mt-8 max-w-2xl text-[16px] leading-[1.65] text-[var(--color-ink-soft)]">
                We read every message. For anything urgent —
                lawyer partnerships, press, an active dispute — note the topic and we’ll
                route it the same day.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mt-20">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Channel sidebar */}
            <aside className="lg:col-span-4">
              <div className="border-t border-[var(--color-hairline)] pt-6">
                <p className="mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-muted-2)] mb-4">
                  Direct
                </p>
                <ul className="space-y-5">
                  <li>
                    <p className="mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-muted-2)]">
                      Email
                    </p>
                    <a
                      href="mailto:hello@musicianslegit.com"
                      className="mt-2 inline-flex items-baseline gap-2 text-[18px] tracking-tight text-[var(--color-ink)] hover:text-[var(--color-brass-deep)]"
                      style={{ fontFamily: "var(--font-fraunces), serif" }}
                    >
                      hello@musicianslegit.com
                      <Mail className="size-4" strokeWidth={1.4} />
                    </a>
                  </li>
                  <li>
                    <p className="mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-muted-2)]">
                      For attorneys
                    </p>
                    <a
                      href="mailto:counsel@musicianslegit.com"
                      className="mt-2 inline-flex items-baseline gap-2 text-[18px] tracking-tight text-[var(--color-ink)] hover:text-[var(--color-brass-deep)]"
                      style={{ fontFamily: "var(--font-fraunces), serif" }}
                    >
                      counsel@musicianslegit.com
                    </a>
                  </li>
                  <li>
                    <p className="mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-muted-2)]">
                      Press
                    </p>
                    <a
                      href="mailto:press@musicianslegit.com"
                      className="mt-2 inline-flex items-baseline gap-2 text-[18px] tracking-tight text-[var(--color-ink)] hover:text-[var(--color-brass-deep)]"
                      style={{ fontFamily: "var(--font-fraunces), serif" }}
                    >
                      press@musicianslegit.com
                    </a>
                  </li>
                </ul>

                <div className="mt-12 border-t border-[var(--color-hairline)] pt-6">
                  <p className="mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-muted-2)] mb-3">
                    Response window
                  </p>
                  <p
                    style={{ fontFamily: "var(--font-fraunces), serif" }}
                    className="text-[40px] tracking-tight text-[var(--color-ink)] leading-[0.95]"
                  >
                    1–2
                    <span className="mono ml-2 text-[12px] tracking-[0.16em] uppercase text-[var(--color-muted-2)]">
                      business days
                    </span>
                  </p>
                </div>
              </div>
            </aside>

            {/* Form */}
            <div className="lg:col-span-8">
              <form
                onSubmit={onSubmit}
                className="border border-[var(--color-ink)] bg-[var(--color-card)]"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-[var(--color-hairline)]">
                  <Field label="Your name" optional>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Optional"
                      className="w-full bg-transparent outline-none text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-muted-2)]"
                    />
                  </Field>
                  <Field label="Email" required>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@band.com"
                      className="w-full bg-transparent outline-none text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-muted-2)]"
                    />
                  </Field>
                </div>

                <div className="border-b border-[var(--color-hairline)] p-5 sm:p-6">
                  <p className="mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-muted-2)]">
                    Topic
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {TOPICS.map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setTopic(t)}
                        className={cn(
                          "px-3.5 py-2 text-[12px] border transition-colors",
                          topic === t
                            ? "bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]"
                            : "bg-transparent text-[var(--color-muted)] border-[var(--color-hairline)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)]",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Message" required>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    placeholder="Tell us what you’re working on, what’s confusing, or what you’d need to use this on a real deal."
                    className="w-full bg-transparent outline-none text-[15px] leading-[1.6] text-[var(--color-ink)] placeholder:text-[var(--color-muted-2)] resize-none"
                  />
                </Field>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-[var(--color-hairline)] p-5 sm:p-6">
                  <p className="mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-muted-2)] max-w-xs">
                    By submitting, you agree we may reply by email. We don’t share your
                    info.
                  </p>
                  <button
                    type="submit"
                    disabled={state === "loading" || state === "ok"}
                    className={cn(
                      "btn-ink",
                      state === "ok" && "!bg-[var(--color-success)] !border-[var(--color-success)]",
                    )}
                  >
                    {state === "ok" ? (
                      <>
                        <Check className="size-4" strokeWidth={2.4} />
                        Sent
                      </>
                    ) : state === "loading" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="loading-pulse !bg-[var(--color-paper)]" />
                        <span className="loading-pulse !bg-[var(--color-paper)]" />
                        <span className="loading-pulse !bg-[var(--color-paper)]" />
                      </span>
                    ) : (
                      <>
                        Send message
                        <Send className="size-3.5" strokeWidth={1.6} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {feedback && (
                <p
                  className={cn(
                    "mono mt-4 text-[11px] tracking-[0.14em] uppercase",
                    state === "ok"
                      ? "text-[var(--color-success)]"
                      : state === "error"
                        ? "text-[var(--color-danger)]"
                        : "text-[var(--color-muted-2)]",
                  )}
                >
                  {feedback}
                </p>
              )}

              <p className="mt-10 text-[13px] text-[var(--color-muted)]">
                Prefer to skip the form?{" "}
                <Link
                  href="/demo"
                  className="text-[var(--color-ink)] underline underline-offset-4 decoration-[var(--color-brass)] hover:text-[var(--color-brass-deep)]"
                >
                  Open the live demo
                </Link>{" "}
                — no signup required.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block p-5 sm:p-6 sm:[&:not(:last-child)]:border-r border-[var(--color-hairline)]">
      <span className="mono flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--color-muted-2)]">
        {label}
        {required && <span className="text-[var(--color-brass-deep)]">required</span>}
        {optional && <span>optional</span>}
      </span>
      <span className="mt-3 block">{children}</span>
    </label>
  );
}
