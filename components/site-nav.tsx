"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/demo", label: "Demo" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
        scrolled
          ? "bg-[var(--color-paper)]/85 backdrop-blur-md border-b border-[var(--color-hairline)]"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="group flex items-center gap-2.5">
          <Wordmark />
          <span className="mono text-[10px] tracking-[0.22em] text-[var(--color-muted-2)] uppercase hidden sm:inline">
            Est. 2026 · US
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative text-[13px] tracking-tight transition-colors",
                  active ? "text-[var(--color-ink)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]",
                )}
              >
                {link.label}
                {active && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-[var(--color-ink)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="hidden md:inline-flex items-center gap-1.5 border border-[var(--color-ink)] px-3.5 py-1.5 text-[12px] font-medium tracking-tight text-[var(--color-ink)] transition hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]"
          >
            Try Demo
            <ArrowUpRight className="size-3.5" strokeWidth={1.6} />
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden grid size-9 place-items-center text-[var(--color-ink)]"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--color-hairline)] bg-[var(--color-paper)]">
          <div className="px-6 py-6 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2 text-[15px] text-[var(--color-ink)] border-b border-[var(--color-hairline-soft)]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/demo"
              onClick={() => setOpen(false)}
              className="mt-3 btn-ink"
            >
              Try the demo
              <ArrowUpRight className="size-3.5" strokeWidth={1.6} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Wordmark() {
  return (
    <div className="flex items-baseline gap-1.5">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="0.5" y="0.5" width="23" height="23" stroke="currentColor" />
        <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="0.7" />
        <line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="0.7" />
        <line x1="4" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="0.7" />
        <line x1="4" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="0.7" />
        <circle cx="7" cy="16" r="1.6" fill="currentColor" />
        <line x1="8.6" y1="16" x2="8.6" y2="11" stroke="currentColor" strokeWidth="0.9" />
      </svg>
      <span
        style={{ fontFamily: "var(--font-fraunces), serif" }}
        className="text-[17px] tracking-tight text-[var(--color-ink)] font-medium"
      >
        Musicians Legit
      </span>
    </div>
  );
}
