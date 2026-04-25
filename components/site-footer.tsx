import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-32 border-t border-[var(--color-hairline)] bg-[var(--color-paper)]">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <p
              style={{ fontFamily: "var(--font-fraunces), serif" }}
              className="text-3xl tracking-tight text-[var(--color-ink)] leading-[1.05]"
            >
              Music contracts,
              <br />
              <em className="text-[var(--color-brass-deep)]">drafted with rigor.</em>
            </p>
            <p className="mono mt-6 text-[11px] tracking-[0.18em] text-[var(--color-muted-2)] uppercase">
              Index — File 01.4 / Vol. 2026
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-10">
            <FooterCol
              label="Product"
              links={[
                { href: "/demo", label: "Demo" },
                { href: "/pricing", label: "Pricing" },
                { href: "/#how-it-works", label: "How it works" },
                { href: "/#archetypes", label: "Coverage" },
              ]}
            />
            <FooterCol
              label="Resources"
              links={[
                { href: "/faq", label: "FAQ" },
                { href: "/contact", label: "Contact" },
                { href: "/#disclaimer", label: "Disclaimer" },
              ]}
            />
            <FooterCol
              label="Legal"
              links={[
                { href: "/contact", label: "Privacy" },
                { href: "/contact", label: "Terms" },
                { href: "mailto:hello@musicianslegit.com", label: "hello@musicianslegit.com" },
              ]}
            />
          </div>
        </div>

        <div className="mt-16 pt-6 border-t border-[var(--color-hairline-soft)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="mono text-[11px] tracking-[0.16em] text-[var(--color-muted-2)] uppercase">
            © {year} Musicians Legit · Drafts only · US jurisdiction
          </p>
          <p className="text-[12px] text-[var(--color-muted)] max-w-md sm:text-right">
            <strong className="text-[var(--color-ink)] font-medium">Not legal advice.</strong>{" "}
            Always have a licensed music attorney review before signing.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  label,
  links,
}: {
  label: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="mono text-[10px] tracking-[0.22em] text-[var(--color-muted-2)] uppercase mb-4">
        {label}
      </p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-[13px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
