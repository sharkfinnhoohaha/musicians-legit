"use client";

import { useState } from "react";
import { Plus, Minus, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmailCapture } from "@/components/email-capture";

const FAQS: { num: string; q: string; a: React.ReactNode; group: string }[] = [
  {
    num: "01",
    group: "Product",
    q: "Is this legal advice?",
    a: (
      <>
        <strong>No.</strong> Musicians Legit produces drafts based on US music-industry
        conventions. It is not a substitute for a licensed attorney. Every draft is
        marked DRAFT, and the final step before signing should always be a
        review by a music attorney — especially for high-stakes deals (advances,
        equity, master ownership, multi-territory rights).
      </>
    ),
  },
  {
    num: "02",
    group: "Product",
    q: "What contracts can it draft?",
    a: (
      <>
        Fifteen archetypes covering the situations that come up most often for indie
        artists: split sheets, producer agreements (beat lease & exclusive),
        sync licenses, gig contracts, session-musician agreements, band partnerships,
        NDAs, co-writer MOUs, mixing & mastering scopes, management deals, sample
        clearance letters, cover-song mechanical licenses, distribution memos,
        featured-artist agreements, and pay-to-play pushback terms.
      </>
    ),
  },
  {
    num: "03",
    group: "Product",
    q: "How does the confidence score work?",
    a: (
      <>
        Each draft returns a transparent score with five components:
        <ul className="mt-3 space-y-1.5 list-square pl-4">
          <li>Clause-library coverage — how well retrieved clauses match your scenario</li>
          <li>Schema completeness — were all required fields populated</li>
          <li>Lawyer-reviewed ratio — what fraction of cited clauses are paralegal-reviewed</li>
          <li>Provenance density — how many clauses cite a public source</li>
          <li>Hallucination guard — no invented statutes or case law detected</li>
        </ul>
        <p className="mt-3">Hover any clause in the draft to see why it was included.</p>
      </>
    ),
  },
  {
    num: "04",
    group: "Product",
    q: "What jurisdictions are supported?",
    a: (
      <>
        US only at launch. The clause library is sourced from US public-domain materials
        and the reasoning system is calibrated for US contract conventions. UK, EU, and
        Canada are on the roadmap — but we’d rather do one jurisdiction excellently than
        five passably.
      </>
    ),
  },
  {
    num: "05",
    group: "AI & Privacy",
    q: "Which AI model do you use?",
    a: (
      <>
        Google Gemini, accessed through the AI SDK with strict structured-output
        validation. You can use our hosted key (paid plans) or bring your own free key
        from Google AI Studio (beta tier).
      </>
    ),
  },
  {
    num: "06",
    group: "AI & Privacy",
    q: "Are my drafts used to train AI models?",
    a: (
      <>
        No. We do not send your drafts to any training pipeline. When you use your own
        Gemini key, your scenario goes to Google under <em>your</em> account&apos;s
        terms — typically not used for training on the paid tier, sometimes used on
        free tier. Our hosted key is configured for zero-retention.
      </>
    ),
  },
  {
    num: "07",
    group: "AI & Privacy",
    q: "What if the AI is rate-limited or down?",
    a: (
      <>
        A deterministic <strong>template-assembly fallback</strong> kicks in. It uses a
        keyword classifier and regex-based field extractor to assemble a contract from
        the same clause library, with a clear note in the export that it was generated
        by templates rather than AI.
      </>
    ),
  },
  {
    num: "08",
    group: "Pricing & Access",
    q: "Is it really free during beta?",
    a: (
      <>
        Yes. Bring your own free Gemini key, generate as many drafts as the free tier
        allows (~ a few hundred per day), no credit card. Paid plans add a hosted key,
        history, PDF export, e-signature, and priority support — none of which are
        required to use the core product.
      </>
    ),
  },
  {
    num: "09",
    group: "Pricing & Access",
    q: "What happens when paid plans launch?",
    a: (
      <>
        Anyone on the waitlist receives thirty days of the Indie tier on the house and
        a permanent introductory rate (locked in as long as the subscription remains
        active). You will not be charged without explicit consent.
      </>
    ),
  },
  {
    num: "10",
    group: "For lawyers",
    q: "I’m a music attorney — can I plug into this?",
    a: (
      <>
        Yes. The Counsel tier lets you bring your firm’s clause library, set
        defaults, get audit logs, and white-label exports.{" "}
        <Link href="/contact" className="underline underline-offset-4 decoration-[var(--color-brass)]">
          Get in touch
        </Link>{" "}
        — we’re actively interviewing partners.
      </>
    ),
  },
];

const GROUPS = ["Product", "AI & Privacy", "Pricing & Access", "For lawyers"];

export default function FAQPage() {
  const [open, setOpen] = useState<string | null>("01");

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
              <p className="section-tag">03 — FAQ</p>
            </div>
            <div className="lg:col-span-9">
              <h1 className="display text-[clamp(2.5rem,6vw,5rem)]">
                Common questions,
                <br />
                <em>answered plainly.</em>
              </h1>
              <p className="mt-8 max-w-2xl text-[16px] leading-[1.65] text-[var(--color-ink-soft)]">
                The product is opinionated and we’d rather be direct than vague. If
                something below isn’t covered,{" "}
                <Link
                  href="/contact"
                  className="underline underline-offset-4 decoration-[var(--color-brass)] hover:text-[var(--color-brass-deep)]"
                >
                  ask us
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mt-20">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Sticky group sidebar */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-32 border-t border-[var(--color-hairline)] pt-6">
                <p className="mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-muted-2)] mb-4">
                  Sections
                </p>
                <ul className="space-y-2.5">
                  {GROUPS.map((g, i) => (
                    <li key={g}>
                      <a
                        href={`#group-${i}`}
                        className="text-[13px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                      >
                        <span className="mono mr-3 text-[var(--color-muted-2)]">
                          0{i + 1}
                        </span>
                        {g}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <div className="lg:col-span-9">
              {GROUPS.map((g, gi) => (
                <div key={g} id={`group-${gi}`} className={gi > 0 ? "mt-16" : ""}>
                  <p className="mono text-[10px] tracking-[0.22em] uppercase text-[var(--color-muted-2)] mb-2">
                    Section 0{gi + 1}
                  </p>
                  <h2
                    style={{ fontFamily: "var(--font-fraunces), serif" }}
                    className="text-[28px] tracking-tight text-[var(--color-ink)]"
                  >
                    {g}
                  </h2>
                  <ul className="mt-6 border-t border-[var(--color-hairline)]">
                    {FAQS.filter((f) => f.group === g).map((f) => {
                      const isOpen = open === f.num;
                      return (
                        <li
                          key={f.num}
                          className="border-b border-[var(--color-hairline)]"
                        >
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => setOpen(isOpen ? null : f.num)}
                            className="group flex w-full items-baseline justify-between gap-6 py-6 text-left"
                          >
                            <span className="flex items-baseline gap-5">
                              <span className="mono text-[11px] tracking-[0.16em] text-[var(--color-muted-2)] uppercase">
                                {f.num}
                              </span>
                              <span
                                style={{ fontFamily: "var(--font-fraunces), serif" }}
                                className={cn(
                                  "text-[20px] lg:text-[22px] leading-[1.25] tracking-tight transition-colors",
                                  isOpen ? "text-[var(--color-brass-deep)]" : "text-[var(--color-ink)]",
                                )}
                              >
                                {f.q}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "shrink-0 size-8 grid place-items-center border transition-colors",
                                isOpen
                                  ? "bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]"
                                  : "border-[var(--color-hairline)] text-[var(--color-ink)] group-hover:border-[var(--color-ink)]",
                              )}
                            >
                              {isOpen ? (
                                <Minus className="size-3.5" strokeWidth={1.6} />
                              ) : (
                                <Plus className="size-3.5" strokeWidth={1.6} />
                              )}
                            </span>
                          </button>
                          <div
                            className={cn(
                              "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out",
                              isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                            )}
                          >
                            <div className="min-h-0">
                              <div className="pb-7 pl-12 lg:pl-14 max-w-2xl text-[15px] leading-[1.7] text-[var(--color-ink-soft)]">
                                {f.a}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Still have questions */}
      <section className="relative mt-32">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
          <div className="border-t border-[var(--color-ink)] pt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7">
              <p className="section-tag">— Still have questions?</p>
              <h2 className="display mt-7 text-[clamp(2rem,4.5vw,3.4rem)]">
                Reach out.
                <br />
                <em>We answer in plain English.</em>
              </h2>
            </div>
            <div className="lg:col-span-5 flex flex-col gap-6 justify-end">
              <EmailCapture context="faq-cta" cta="Join the list" />
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-ink)] border-b border-[var(--color-ink)] pb-1 self-start hover:text-[var(--color-brass-deep)] hover:border-[var(--color-brass-deep)] transition-colors"
              >
                Open contact form
                <ArrowUpRight className="size-3.5" strokeWidth={1.6} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
