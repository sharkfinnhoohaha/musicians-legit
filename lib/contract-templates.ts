// Contract template recipes — which clauses (by slug) to assemble for each archetype.
// Slugs MUST match what was seeded by lib/clauses/seed/*.md (loaded via scripts/seed-clauses.ts).
// The autoresearch loop can edit `defaultClauseSlugs` based on eval scores.

import type { ArchetypeSlug } from "@/lib/archetypes";

type TemplateRecipe = {
  archetype: ArchetypeSlug;
  name: string;
  defaultClauseSlugs: string[];
  guidance: string;
};

// Boilerplate slugs that apply to every contract.
const UNIVERSAL_BOILERPLATE = [
  "boilerplate--governing-law-delaware",
  "boilerplate--entire-agreement-severability",
];

export const CONTRACT_TEMPLATES: Record<ArchetypeSlug, TemplateRecipe> = {
  "split-sheet": {
    archetype: "split-sheet",
    name: "Songwriter Split Sheet",
    defaultClauseSlugs: [
      "split-sheet--definitions",
      "split-sheet--ownership-percentages",
      "split-sheet--master-vs-publishing",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Document writer shares for a single song before any release. Each writer signs.",
  },
  "producer-beat-agreement": {
    archetype: "producer-beat-agreement",
    name: "Producer / Beat Agreement",
    defaultClauseSlugs: [
      "producer-beat-agreement--lease-vs-exclusive",
      "producer-beat-agreement--master-points-publishing",
      "producer-beat-agreement--sample-warranty",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Cover whether the beat is leased or exclusive, master points, and producer's sample-clearance warranty.",
  },
  "work-for-hire-vs-royalty": {
    archetype: "work-for-hire-vs-royalty",
    name: "Session Player / Engineer Agreement",
    defaultClauseSlugs: [
      "work-for-hire-vs-royalty--wfh-election",
      "work-for-hire-vs-royalty--royalty-election",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Clarify up-front whether the contributor is paid a flat fee (work-for-hire) or back-end royalty.",
  },
  "recoupment-advance": {
    archetype: "recoupment-advance",
    name: "Recoupment & Advance Side-Letter",
    defaultClauseSlugs: [
      "recoupment-advance--recoupable-costs",
      "recoupment-advance--cross-collateralization",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Defines what costs can be recouped from royalties and whether revenue streams cross-collateralize.",
  },
  "360-deal": {
    archetype: "360-deal",
    name: "Multi-Rights (360) Term Sheet",
    defaultClauseSlugs: [
      "360-deal--scope-with-carveouts",
      "360-deal--touring-merch-sunset",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Enumerate exactly which revenue streams the label participates in, with carve-outs and sunset dates.",
  },
  "management-agreement": {
    archetype: "management-agreement",
    name: "Artist Management Agreement",
    defaultClauseSlugs: [
      "management-agreement--commission-base",
      "management-agreement--sunset-and-keyman",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Pin down commission base (gross vs net), term, sunset, and key-man.",
  },
  "sync-licensing": {
    archetype: "sync-licensing",
    name: "Sync Licensing Agreement",
    defaultClauseSlugs: [
      "sync-licensing--one-stop-grant",
      "sync-licensing--term-territory-mfn",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Most sync deals require one-stop representation. State scope, territory, term, and most-favored-nations.",
  },
  "sample-clearance": {
    archetype: "sample-clearance",
    name: "Sample Clearance Side-Letter",
    defaultClauseSlugs: [
      "sample-clearance--who-clears",
      "sample-clearance--royalty-holdback",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Allocate clearance responsibility and hold back royalties until clearance is documented.",
  },
  "band-partnership": {
    archetype: "band-partnership",
    name: "Band Partnership Agreement",
    defaultClauseSlugs: [
      "band-partnership--name-ownership",
      "band-partnership--leaving-member",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Set up name ownership, leaving-member buyout, and song-ownership rules.",
  },
  "performance-gig": {
    archetype: "performance-gig",
    name: "Performance / Gig Contract",
    defaultClauseSlugs: [
      "performance-gig--deposit-and-payment",
      "performance-gig--cancellation-and-force-majeure",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Deposit, cancellation ladder, force majeure, and payment timing prevent the most common gig disputes.",
  },
  "pay-to-play": {
    archetype: "pay-to-play",
    name: "Promoter Disclosure Side-Letter",
    defaultClauseSlugs: [
      "pay-to-play--red-flag-disclosure",
      "pay-to-play--no-commitment-default",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "If a promoter is requiring ticket sales, force a written disclosure and refund-protection clause.",
  },
  "publishing-admin-vs-copub": {
    archetype: "publishing-admin-vs-copub",
    name: "Publishing Admin or Co-Pub Term Sheet",
    defaultClauseSlugs: [
      "publishing-admin-vs-copub--admin-only",
      "publishing-admin-vs-copub--copub-election",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Make the admin-vs-co-pub election explicit; preserve ownership in admin deals.",
  },
  "distribution-agreement": {
    archetype: "distribution-agreement",
    name: "Distribution Agreement",
    defaultClauseSlugs: [
      "distribution-agreement--term-and-exclusivity",
      "distribution-agreement--ownership-confirmation",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Watch for auto-renewal traps and confirm artist owns the master.",
  },
  "master-ownership": {
    archetype: "master-ownership",
    name: "Master Ownership Side-Letter",
    defaultClauseSlugs: [
      "master-ownership--who-paid-test",
      "master-ownership--default-rule",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "Determine ownership using the who-paid test, then state the default rule.",
  },
  "nda-collab": {
    archetype: "nda-collab",
    name: "Co-Write NDA / Collaboration Agreement",
    defaultClauseSlugs: [
      "nda-collab--scope-of-confidential-info",
      "nda-collab--obligations-and-term",
      ...UNIVERSAL_BOILERPLATE,
    ],
    guidance: "For remote co-writes, lock down confidentiality and authorship paper trail.",
  },
};
