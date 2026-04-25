import Link from "next/link";
import { ArrowUpRight, ArrowRight, FileSignature, Layers, Scale, Gauge, Sparkles } from "lucide-react";
import { EmailCapture } from "@/components/email-capture";
import { LoadingMark } from "@/components/loading-mark";

const ARCHETYPES = [
  { num: "01", name: "Split Sheet", desc: "Songwriter & producer ownership splits, master vs. publishing." },
  { num: "02", name: "Producer Agreement", desc: "Beat lease, exclusive sale, work-for-hire, royalty triggers." },
  { num: "03", name: "Sync License", desc: "One-time use grant for film, TV, ads, YouTube, games." },
  { num: "04", name: "Gig Contract", desc: "Live performance terms, tech rider, cancellation policy, deposit." },
  { num: "05", name: "Session Musician", desc: "Flat-fee work, name credits, royalty waiver, master ownership." },
  { num: "06", name: "Band Partnership", desc: "Name ownership, departures, voting, treasury, IP assignments." },
  { num: "07", name: "NDA / Pre-Listen", desc: "Mutual confidentiality before sharing unreleased material." },
  { num: "08", name: "Co-Writer MOU", desc: "Memorandum before formal split sheet — capture intent fast." },
  { num: "09", name: "Mixing & Mastering", desc: "Engineer scope, revisions, deliverables, kill-fee terms." },
  { num: "10", name: "Management Agreement", desc: "Commission, term, sunset clause, key-person, exclusivity." },
  { num: "11", name: "Sample Clearance", desc: "Letter of intent, clearance contingency, reversion language." },
  { num: "12", name: "Cover Song License", desc: "Mechanical license memorandum (US compulsory rate)." },
  { num: "13", name: "Distribution Memo", desc: "Aggregator term, revenue share, takedown rights." },
  { num: "14", name: "Featured Artist", desc: "Guest verse fee, credit, controlled-comp, royalty terms." },
  { num: "15", name: "Venue Pay-to-Play Pushback", desc: "Counter-terms when venues push back risk onto artists." },
];

export default function HomePage() {
  return (
    <main className="relative">
      {/* Atmospheric grid backdrop on hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[820px] hairline-grid opacity-40"
      />

      {/* ─────────────────────────────────  HERO  ───────────────────────────────── */}
      <section className="relative">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10 pt-20 lg:pt-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="rise rise-1 section-tag">
                <span>00 / Public Beta</span>
              </p>
              <h1 className="rise rise-2 display mt-7 text-[clamp(3rem,8vw,7.25rem)] text-[var(--color-ink)]">
                A paralegal’s
                <br />
                <em>rigor</em>, at the
                <br />
                speed of a&nbsp;DM.
              </h1>
              <p className="rise rise-3 mt-10 max-w-xl text-[17px] leading-[1.6] text-[var(--color-ink-soft)] dropcap">
                Musicians Legit drafts the contracts independent artists actually need —
                split sheets, producer agreements, sync licenses, gig terms, and twelve
                more — from a plain-English description of your situation. Each draft
                is grounded in US music-industry conventions, returned with a
                transparent confidence score, and ready to send to your attorney.
              </p>

              <div className="rise rise-4 mt-12 flex flex-col gap-6">
                <p className="mono text-[10px] tracking-[0.22em] text-[var(--color-muted-2)] uppercase">
                  Reserve your seat — early access in waves
                </p>
                <EmailCapture size="lg" context="landing-hero" cta="Request access" />
              </div>

              <div className="rise rise-5 mt-10 flex flex-wrap items-center gap-x-7 gap-y-3">
                <Link
                  href="/demo"
                  className="group inline-flex items-center gap-2 text-[15px] font-medium text-[var(--color-ink)] border-b border-[var(--color-ink)] pb-1 transition-colors hover:text-[var(--color-brass-deep)] hover:border-[var(--color-brass-deep)]"
                >
                  Try the live demo
                  <ArrowUpRight
                    className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={1.6}
                  />
                </Link>
                <span className="mono text-[11px] tracking-[0.16em] text-[var(--color-muted-2)] uppercase">
                  No signup · Free Gemini tier
                </span>
              </div>
            </div>

            {/* Right column — editorial info card */}
            <aside className="lg:col-span-5 lg:pl-10 lg:border-l lg:border-[var(--color-hairline)]">
              <div className="rise rise-3 sticky top-32">
                <p className="mono text-[10px] tracking-[0.22em] text-[var(--color-muted-2)] uppercase">
                  File 01.0 — Index
                </p>

                <dl className="mt-6 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
                  <Row k="Coverage" v="15 archetypes" />
                  <Row k="Jurisdiction" v="United States" />
                  <Row k="Avg. draft time" v="≈ 38 seconds" />
                  <Row k="Confidence score" v="5-component, weighted" />
                  <Row k="Lawyer-reviewed clauses" v="Rolling, marked in-line" />
                  <Row k="Fallback mode" v="Deterministic templates" />
                </dl>

                <p className="mt-8 text-[13px] leading-[1.6] text-[var(--color-muted)]">
                  Built to be{" "}
                  <span className="text-[var(--color-ink)]">explainable</span> — every
                  clause shows where it came from and why it’s there. It is{" "}
                  <span className="text-[var(--color-ink)]">not legal advice</span> and
                  shouldn’t be a substitute for one. It is the rigorous first draft you
                  used to wait days and pay hundreds for.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────  THE PROBLEM  ───────────────────────────────── */}
      <section className="relative mt-32 lg:mt-40">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-3">
              <p className="section-tag">01 — Why this exists</p>
            </div>
            <div className="lg:col-span-9">
              <h2 className="display text-[clamp(2rem,4.5vw,3.4rem)] max-w-3xl">
                Indie artists make the deals,
                <br />
                <em>but rarely paper them.</em>
              </h2>
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-8 text-[15px] leading-[1.65] text-[var(--color-ink-soft)] max-w-5xl">
                <p>
                  A producer makes a beat in a hotel room at 2am. A song happens. Eight
                  months later it goes viral and nobody can find the receipt for who owns
                  what.
                </p>
                <p>
                  A session player records a verse for $300 cash. The track climbs the
                  charts. Now there’s a fight about royalties that should have been
                  settled in writing on day one.
                </p>
                <p>
                  A four-piece band tours for years without papering the name. One member
                  leaves. The remaining three discover the LLC was never formed and the
                  trademark was never filed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────  HOW IT WORKS  ───────────────────────────────── */}
      <section id="how-it-works" className="relative mt-32 lg:mt-40">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-3">
              <p className="section-tag">02 — How it works</p>
            </div>
            <div className="lg:col-span-9">
              <h2 className="display text-[clamp(2rem,4.5vw,3.4rem)] max-w-3xl">
                One paragraph in.
                <br />
                <em>A grounded draft out.</em>
              </h2>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-[var(--color-hairline)]">
            <Step
              num="01"
              icon={<FileSignature className="size-4" strokeWidth={1.4} />}
              title="Describe it"
              body="Type the situation in your own words. Up to four clarifying questions if anything is missing — never more."
            />
            <Step
              num="02"
              icon={<Layers className="size-4" strokeWidth={1.4} />}
              title="Classify & retrieve"
              body="The system slots your case into one of fifteen archetypes and pulls the relevant clauses from a curated library."
              dark
            />
            <Step
              num="03"
              icon={<Scale className="size-4" strokeWidth={1.4} />}
              title="Generate & ground"
              body="A structured contract is drafted with strict schema validation — no hallucinated statutes, no invented case law."
            />
            <Step
              num="04"
              icon={<Gauge className="size-4" strokeWidth={1.4} />}
              title="Score & ship"
              body="A five-component confidence score tells you how solid the draft is, and where it needs a lawyer’s eye."
              dark
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────  COVERAGE GRID  ───────────────────────────────── */}
      <section id="archetypes" className="relative mt-32 lg:mt-40">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-3">
              <p className="section-tag">03 — Coverage</p>
            </div>
            <div className="lg:col-span-9">
              <h2 className="display text-[clamp(2rem,4.5vw,3.4rem)] max-w-3xl">
                Fifteen contracts.
                <br />
                <em>The ones that actually come up.</em>
              </h2>
              <p className="mt-8 max-w-2xl text-[15px] leading-[1.65] text-[var(--color-muted)]">
                Every archetype maps to clause sets sourced from public-domain industry
                materials and refined through a frozen evaluation harness. New archetypes
                are added when a clear cluster of demand emerges — not before.
              </p>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--color-hairline)] border border-[var(--color-hairline)]">
            {ARCHETYPES.map((a) => (
              <div
                key={a.num}
                className="group bg-[var(--color-paper)] hover:bg-[var(--color-card)] transition-colors p-6 lg:p-7"
              >
                <p className="mono text-[10px] tracking-[0.22em] text-[var(--color-muted-2)] uppercase">
                  {a.num}
                </p>
                <h3
                  style={{ fontFamily: "var(--font-fraunces), serif" }}
                  className="mt-4 text-[22px] tracking-tight text-[var(--color-ink)]"
                >
                  {a.name}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-[var(--color-muted)]">
                  {a.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────  LOADING ANIMATION SHOWCASE  ───────────────────────────────── */}
      <section className="relative mt-32 lg:mt-40">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <p className="section-tag">04 — Brand mark</p>
              <h2 className="display mt-7 text-[clamp(2rem,4.5vw,3.4rem)]">
                Where the score
                <br />
                <em>becomes the statute.</em>
              </h2>
              <p className="mt-8 text-[15px] leading-[1.65] text-[var(--color-muted)] max-w-md">
                Our drafting indicator is a five-line musical staff that draws itself,
                then dissolves into structured contract paragraphs. A small detail —
                but the thesis of the product, in motion.
              </p>
              <p className="mono mt-6 text-[11px] tracking-[0.16em] text-[var(--color-muted-2)] uppercase">
                Hold to watch the loop
              </p>
            </div>
            <div className="lg:col-span-7">
              <div className="border border-[var(--color-hairline)] bg-[var(--color-card)] p-12 lg:p-20 grid place-items-center">
                <LoadingMark size={120} label="Drafting · 38s avg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────  PRICING TEASER  ───────────────────────────────── */}
      <section className="relative mt-32 lg:mt-40">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-3">
              <p className="section-tag">05 — Pricing</p>
            </div>
            <div className="lg:col-span-9">
              <h2 className="display text-[clamp(2rem,4.5vw,3.4rem)]">
                Free while in beta.
                <br />
                <em>Honest paid tiers later.</em>
              </h2>
              <p className="mt-8 max-w-xl text-[15px] leading-[1.65] text-[var(--color-muted)]">
                Use it free with a Google Gemini key. If we ship paid plans, anyone on
                the waitlist gets thirty days on the house and a permanent introductory
                rate.
              </p>
              <Link
                href="/pricing"
                className="mt-10 inline-flex items-center gap-2 text-[15px] font-medium text-[var(--color-ink)] border-b border-[var(--color-ink)] pb-1 hover:text-[var(--color-brass-deep)] hover:border-[var(--color-brass-deep)] transition-colors"
              >
                See pricing detail
                <ArrowRight className="size-4" strokeWidth={1.6} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────  CLOSING CTA  ───────────────────────────────── */}
      <section id="disclaimer" className="relative mt-32 lg:mt-40">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="border-t border-[var(--color-ink)] pt-12 lg:pt-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7">
                <p className="mono text-[10px] tracking-[0.22em] text-[var(--color-muted-2)] uppercase">
                  Closing — File 99
                </p>
                <h2 className="display mt-7 text-[clamp(2.25rem,5vw,4.5rem)]">
                  Get the next draft
                  <br />
                  <em>before the deal cools.</em>
                </h2>
              </div>
              <div className="lg:col-span-5 flex flex-col justify-end gap-6">
                <p className="text-[15px] leading-[1.65] text-[var(--color-muted)]">
                  Drop your email below for early access, or jump straight into the live
                  demo — no signup, no credit card, runs on a free Gemini key.
                </p>
                <EmailCapture size="lg" context="landing-cta" cta="Join the list" />
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-ink)] border-b border-[var(--color-ink)] pb-1 self-start hover:text-[var(--color-brass-deep)] hover:border-[var(--color-brass-deep)] transition-colors"
                >
                  Or open the demo
                  <ArrowUpRight className="size-3.5" strokeWidth={1.6} />
                </Link>
              </div>
            </div>

            <div className="mt-16 pt-6 border-t border-[var(--color-hairline)] flex flex-col sm:flex-row gap-3 sm:justify-between">
              <p className="mono text-[10px] tracking-[0.22em] text-[var(--color-muted-2)] uppercase flex items-center gap-2">
                <Sparkles className="size-3" strokeWidth={1.4} />
                Drafts only · Always have an attorney review
              </p>
              <p className="mono text-[10px] tracking-[0.22em] text-[var(--color-muted-2)] uppercase">
                US jurisdiction · v0.1 — Public Beta
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5">
      <dt className="mono text-[10px] tracking-[0.18em] uppercase text-[var(--color-muted-2)]">
        {k}
      </dt>
      <dd className="text-[14px] tracking-tight text-[var(--color-ink)]">{v}</dd>
    </div>
  );
}

function Step({
  num,
  icon,
  title,
  body,
  dark = false,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  dark?: boolean;
}) {
  return (
    <div
      className={
        "relative p-7 lg:p-9 border-r border-b border-[var(--color-hairline)] " +
        (dark ? "bg-[var(--color-card)]" : "bg-transparent")
      }
    >
      <div className="flex items-start justify-between gap-4">
        <p className="mono text-[10px] tracking-[0.22em] text-[var(--color-muted-2)] uppercase">
          {num}
        </p>
        <span className="text-[var(--color-brass-deep)]">{icon}</span>
      </div>
      <h3
        style={{ fontFamily: "var(--font-fraunces), serif" }}
        className="mt-10 text-[26px] leading-[1.05] tracking-tight text-[var(--color-ink)]"
      >
        {title}
      </h3>
      <p className="mt-3 text-[14px] leading-[1.6] text-[var(--color-muted)] max-w-xs">
        {body}
      </p>
    </div>
  );
}
