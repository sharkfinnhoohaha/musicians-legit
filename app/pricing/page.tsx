import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import { EmailCapture } from "@/components/email-capture";

export const metadata = {
  title: "Pricing — Musicians Legit",
  description:
    "Free during public beta. Honest paid tiers when paid plans open — Indie, Studio, and Counsel.",
};

const TIERS = [
  {
    num: "I.",
    name: "Beta",
    price: "Free",
    cadence: "Public beta · indefinite",
    pitch:
      "Use the full product with your own free Google Gemini key. No card, no signup.",
    points: [
      "Unlimited drafts (subject to Gemini’s free tier limits)",
      "All 15 contract archetypes",
      "Confidence score on every draft",
      "Template fallback when AI is rate-limited",
      "Markdown export",
    ],
    cta: { label: "Open the demo", href: "/demo", primary: false },
    feature: false,
  },
  {
    num: "II.",
    name: "Indie",
    price: "$12",
    cadence: "/ month · billed annually",
    pitch:
      "For the working independent artist. Hosted Gemini key, history, and PDF export.",
    points: [
      "Hosted AI key — no setup, no rate limits",
      "Unlimited drafts, all archetypes",
      "Saved contract history (encrypted)",
      "PDF export with branded letterhead",
      "E-signature send via DocuSign or Dropbox Sign",
      "Email support — same business day",
    ],
    cta: { label: "Get on the list", href: "#waitlist", primary: true },
    feature: true,
  },
  {
    num: "III.",
    name: "Studio",
    price: "$48",
    cadence: "/ month · billed annually",
    pitch:
      "For producers, managers, and small labels handling deals on behalf of multiple artists.",
    points: [
      "Everything in Indie",
      "Up to 10 artist profiles, separate histories",
      "Custom clause library — your house terms",
      "Priority lawyer-review queue (rolling)",
      "Bulk export & shared workspace",
      "Phone-a-paralegal — one referral per month",
    ],
    cta: { label: "Get on the list", href: "#waitlist", primary: false },
    feature: false,
  },
];

export default function PricingPage() {
  return (
    <main className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] hairline-grid opacity-30"
      />

      {/* Header */}
      <section className="relative pt-20 lg:pt-32">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-3">
              <p className="section-tag">02 — Pricing</p>
            </div>
            <div className="lg:col-span-9">
              <h1 className="display text-[clamp(2.5rem,6vw,5rem)]">
                Free while we’re young.
                <br />
                <em>Honest when we’re not.</em>
              </h1>
              <p className="mt-8 max-w-2xl text-[16px] leading-[1.65] text-[var(--color-ink-soft)]">
                We’re in public beta. The product is free, indefinitely, with your own
                Google Gemini key. When we ship paid plans, anyone on the waitlist gets
                thirty days on the house and a permanent introductory rate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tier cards */}
      <section className="relative mt-20">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 border-t border-l border-[var(--color-hairline)]">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={
                  "relative border-r border-b border-[var(--color-hairline)] p-8 lg:p-10 flex flex-col " +
                  (tier.feature
                    ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                    : "bg-[var(--color-paper)]")
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={
                      "mono text-[10px] tracking-[0.22em] uppercase " +
                      (tier.feature ? "text-[var(--color-brass)]" : "text-[var(--color-muted-2)]")
                    }
                  >
                    Tier {tier.num}
                  </p>
                  {tier.feature && (
                    <span className="mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-brass)] border border-[var(--color-brass)] px-2 py-0.5">
                      Most popular
                    </span>
                  )}
                </div>
                <h2
                  style={{ fontFamily: "var(--font-fraunces), serif" }}
                  className={
                    "mt-6 text-[42px] tracking-tight leading-none " +
                    (tier.feature ? "text-[var(--color-paper)]" : "text-[var(--color-ink)]")
                  }
                >
                  {tier.name}
                </h2>
                <div className="mt-7 flex items-baseline gap-2">
                  <span
                    style={{ fontFamily: "var(--font-fraunces), serif" }}
                    className={
                      "text-[56px] leading-none tracking-tight " +
                      (tier.feature ? "text-[var(--color-paper)]" : "text-[var(--color-ink)]")
                    }
                  >
                    {tier.price}
                  </span>
                  <span
                    className={
                      "mono text-[11px] tracking-[0.14em] uppercase " +
                      (tier.feature ? "text-[var(--color-paper)]/60" : "text-[var(--color-muted-2)]")
                    }
                  >
                    {tier.cadence}
                  </span>
                </div>
                <p
                  className={
                    "mt-6 text-[14px] leading-[1.6] " +
                    (tier.feature ? "text-[var(--color-paper)]/80" : "text-[var(--color-muted)]")
                  }
                >
                  {tier.pitch}
                </p>

                <ul className="mt-8 space-y-3 flex-1">
                  {tier.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-[13.5px] leading-[1.55]">
                      <Check
                        className={
                          "mt-1 size-3.5 shrink-0 " +
                          (tier.feature
                            ? "text-[var(--color-brass)]"
                            : "text-[var(--color-ink)]")
                        }
                        strokeWidth={2}
                      />
                      <span
                        className={
                          tier.feature ? "text-[var(--color-paper)]/90" : "text-[var(--color-ink-soft)]"
                        }
                      >
                        {p}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10 pt-6 border-t border-current/10">
                  <Link
                    href={tier.cta.href}
                    className={
                      "inline-flex items-center gap-2 text-[14px] font-medium border-b pb-1 transition-colors " +
                      (tier.feature
                        ? "text-[var(--color-brass)] border-[var(--color-brass)] hover:text-[var(--color-paper)] hover:border-[var(--color-paper)]"
                        : "text-[var(--color-ink)] border-[var(--color-ink)] hover:text-[var(--color-brass-deep)] hover:border-[var(--color-brass-deep)]")
                    }
                  >
                    {tier.cta.label}
                    <ArrowUpRight className="size-3.5" strokeWidth={1.6} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Counsel tier (separate / enterprise feel) */}
      <section className="relative mt-32">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-[var(--color-ink)] pt-12">
            <div className="lg:col-span-4">
              <p className="section-tag">IV. — Counsel</p>
              <h2
                style={{ fontFamily: "var(--font-fraunces), serif" }}
                className="mt-7 text-[44px] leading-[0.95] tracking-tight text-[var(--color-ink)]"
              >
                For attorneys
                <br />
                <em className="text-[var(--color-brass-deep)]">and law firms.</em>
              </h2>
            </div>
            <div className="lg:col-span-8 lg:pl-10">
              <p className="text-[16px] leading-[1.65] text-[var(--color-ink-soft)] max-w-2xl">
                A custom workspace for music attorneys: bring your own clause library,
                set firm-specific defaults, get audit logs on every generated draft, and
                white-label the export with your firm’s letterhead. Pricing scales with
                seat count.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-px bg-[var(--color-hairline)] border border-[var(--color-hairline)] max-w-2xl">
                <Stat label="Audit log retention" value="7 years" />
                <Stat label="Concurrent seats" value="Unlimited" />
                <Stat label="SLA" value="99.9% uptime" />
              </div>
              <Link
                href="/contact"
                className="mt-10 inline-flex items-center gap-2 text-[15px] font-medium text-[var(--color-ink)] border-b border-[var(--color-ink)] pb-1 hover:text-[var(--color-brass-deep)] hover:border-[var(--color-brass-deep)] transition-colors"
              >
                Talk to us
                <ArrowUpRight className="size-4" strokeWidth={1.6} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="relative mt-32">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="border-t border-[var(--color-hairline)] pt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7">
              <p className="section-tag">— Waitlist</p>
              <h2 className="display mt-6 text-[clamp(2rem,4.5vw,3.4rem)]">
                Early access.
                <br />
                <em>Permanent intro rate.</em>
              </h2>
            </div>
            <div className="lg:col-span-5 flex items-end">
              <EmailCapture context="pricing-waitlist" cta="Join the list" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-paper)] p-5">
      <p className="mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-muted-2)]">
        {label}
      </p>
      <p
        style={{ fontFamily: "var(--font-fraunces), serif" }}
        className="mt-3 text-[24px] tracking-tight text-[var(--color-ink)]"
      >
        {value}
      </p>
    </div>
  );
}
