// Single source of truth for the 15 archetypes.
// Used by classifier, retrieval bias, contract templates, and the UI example chips.

export const ARCHETYPES = [
  {
    slug: "split-sheet",
    name: "Split Sheet",
    description: "Songwriter/producer credit and royalty splits for a single song.",
    rank: 1,
  },
  {
    slug: "producer-beat-agreement",
    name: "Producer / Beat Agreement",
    description: "Lease vs exclusive beat use, master points, publishing share.",
    rank: 2,
  },
  {
    slug: "work-for-hire-vs-royalty",
    name: "Work-for-Hire or Royalty",
    description: "Session player / engineer compensation: flat fee WFH vs back-end royalty.",
    rank: 3,
  },
  {
    slug: "recoupment-advance",
    name: "Recoupment & Advance",
    description: "How advances are recouped from royalties, cross-collateralization, recoupable cost definitions.",
    rank: 4,
  },
  {
    slug: "360-deal",
    name: "360 / Multi-Rights Deal",
    description: "Label-style deals taking points on touring, merch, sync, publishing.",
    rank: 5,
  },
  {
    slug: "management-agreement",
    name: "Management Agreement",
    description: "Manager commission base, term, sunset clause, key-man.",
    rank: 6,
  },
  {
    slug: "sync-licensing",
    name: "Sync Licensing",
    description: "Licensing a master + composition for film, TV, ads, games.",
    rank: 7,
  },
  {
    slug: "sample-clearance",
    name: "Sample Clearance",
    description: "Who clears the sample, indemnity, royalty hold-back.",
    rank: 8,
  },
  {
    slug: "band-partnership",
    name: "Band Partnership",
    description: "Band name ownership, leaver buyout, vote thresholds, song rights.",
    rank: 9,
  },
  {
    slug: "performance-gig",
    name: "Performance / Gig",
    description: "Live show terms — deposit, cancellation, force majeure, payment.",
    rank: 10,
  },
  {
    slug: "pay-to-play",
    name: "Pay-to-Play / Promoter",
    description: "Promoter ticket-guarantee disclosure, refund/cancellation protection.",
    rank: 11,
  },
  {
    slug: "publishing-admin-vs-copub",
    name: "Publishing: Admin vs Co-Pub",
    description: "Difference between admin (you keep ownership) and co-pub (you sign half).",
    rank: 12,
  },
  {
    slug: "distribution-agreement",
    name: "Distribution Agreement",
    description: "Distro term, exclusivity, takedown, ownership confirmation.",
    rank: 13,
  },
  {
    slug: "master-ownership",
    name: "Master Ownership",
    description: "Who paid for what test, default ownership rule for the recording.",
    rank: 14,
  },
  {
    slug: "nda-collab",
    name: "NDA / Collaboration",
    description: "Co-write confidentiality and authorship paper trail.",
    rank: 15,
  },
] as const;

export type ArchetypeSlug = (typeof ARCHETYPES)[number]["slug"];

export const ARCHETYPE_SLUGS: ArchetypeSlug[] = ARCHETYPES.map((a) => a.slug);

export function archetypeByslug(slug: string) {
  return ARCHETYPES.find((a) => a.slug === slug);
}
