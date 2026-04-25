"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmailCapture({
  size = "lg",
  context = "landing-hero",
  placeholder = "you@band.com",
  cta = "Request access",
}: {
  size?: "lg" | "md";
  context?: string;
  placeholder?: string;
  cta?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || state === "loading") return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      setMessage("Please enter a valid email.");
      return;
    }

    setState("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), context }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status})`);
      }
      setState("ok");
      setMessage("On the list. We’ll be in touch.");
    } catch (err: any) {
      setState("error");
      setMessage(err.message ?? "Something went wrong.");
    }
  }

  return (
    <div className={cn("w-full", size === "lg" ? "max-w-xl" : "max-w-md")}>
      <form onSubmit={onSubmit} className="input-shell">
        <span
          aria-hidden
          className="mono pl-4 text-[10px] tracking-[0.2em] text-[var(--color-muted-2)] uppercase select-none hidden sm:inline"
        >
          File 01 ›
        </span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          disabled={state === "loading" || state === "ok"}
          required
        />
        <button
          type="submit"
          disabled={state === "loading" || state === "ok"}
          className={cn(
            "mr-1 my-1 inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium tracking-tight transition",
            state === "ok"
              ? "bg-[var(--color-success)] text-white"
              : "bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-marine)]",
          )}
        >
          {state === "ok" ? (
            <>
              <Check className="size-4" strokeWidth={2.4} />
              Joined
            </>
          ) : state === "loading" ? (
            <span className="flex items-center gap-1.5">
              <span className="loading-pulse !bg-[var(--color-paper)]" />
              <span className="loading-pulse !bg-[var(--color-paper)]" />
              <span className="loading-pulse !bg-[var(--color-paper)]" />
            </span>
          ) : (
            <>
              {cta}
              <ArrowRight className="size-3.5" strokeWidth={1.6} />
            </>
          )}
        </button>
      </form>

      <p
        className={cn(
          "mono mt-3 text-[11px] tracking-[0.14em] uppercase",
          state === "error"
            ? "text-[var(--color-danger)]"
            : state === "ok"
              ? "text-[var(--color-success)]"
              : "text-[var(--color-muted-2)]",
        )}
      >
        {message ??
          "No spam. Early access + a heads-up when paid plans open."}
      </p>
    </div>
  );
}
