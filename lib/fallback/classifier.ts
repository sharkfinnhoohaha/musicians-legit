// Deterministic keyword-decision-tree classifier. No AI required.
// Targets ~80% accuracy on the head distribution of indie-musician scenarios.

import type { ArchetypeSlug } from "@/lib/archetypes";

type Rule = { archetype: ArchetypeSlug; anyOf: string[]; weight: number };

const RULES: Rule[] = [
  // split-sheet
  { archetype: "split-sheet", weight: 1.0, anyOf: ["split sheet", "songwriter share", "writer share", "songwriting credit", "splits"] },
  { archetype: "split-sheet", weight: 0.7, anyOf: ["wrote together", "co-wrote", "co-write", "credit on the song"] },

  // producer-beat-agreement
  { archetype: "producer-beat-agreement", weight: 1.0, anyOf: ["beat lease", "exclusive beat", "type beat", "beat agreement", "producer agreement", "made a beat", "produced a beat"] },
  { archetype: "producer-beat-agreement", weight: 0.6, anyOf: ["producer", "beat", "instrumental"] },

  // work-for-hire-vs-royalty
  { archetype: "work-for-hire-vs-royalty", weight: 1.0, anyOf: ["work for hire", "wfh", "session player", "session musician", "engineer flat fee"] },
  { archetype: "work-for-hire-vs-royalty", weight: 0.7, anyOf: ["session", "engineer", "mix engineer", "mastering engineer", "flat fee"] },

  // recoupment-advance
  { archetype: "recoupment-advance", weight: 1.0, anyOf: ["recoup", "advance", "cross-collateraliz", "unrecouped"] },

  // 360-deal
  { archetype: "360-deal", weight: 1.0, anyOf: ["360 deal", "label wants my touring", "label wants merch", "multi-rights deal"] },

  // management-agreement
  { archetype: "management-agreement", weight: 1.0, anyOf: ["manager", "management deal", "management agreement", "commission", "sunset clause"] },

  // sync-licensing
  { archetype: "sync-licensing", weight: 1.0, anyOf: ["sync", "synchronization", "licensing for tv", "film placement", "ad placement", "youtube use"] },

  // sample-clearance
  { archetype: "sample-clearance", weight: 1.0, anyOf: ["sample clearance", "clear a sample", "sampled a", "sampling", "interpolat"] },

  // band-partnership
  { archetype: "band-partnership", weight: 1.0, anyOf: ["band partnership", "leaving member", "band breakup", "band split", "who owns the band name"] },
  { archetype: "band-partnership", weight: 0.6, anyOf: ["band agreement", "band members"] },

  // performance-gig
  { archetype: "performance-gig", weight: 1.0, anyOf: ["gig contract", "performance contract", "venue", "booking", "show contract", "deposit for the gig"] },

  // pay-to-play
  { archetype: "pay-to-play", weight: 1.0, anyOf: ["pay to play", "pay-to-play", "ticket guarantee", "promoter wants me to sell"] },

  // publishing-admin-vs-copub
  { archetype: "publishing-admin-vs-copub", weight: 1.0, anyOf: ["publishing admin", "co-pub", "co-publishing", "publishing deal", "admin deal"] },

  // distribution-agreement
  { archetype: "distribution-agreement", weight: 1.0, anyOf: ["distribution", "distrokid", "tunecore", "unitedmasters", "distro", "aggregator"] },

  // master-ownership
  { archetype: "master-ownership", weight: 1.0, anyOf: ["who owns the master", "master ownership", "own the recording", "owns the recording"] },

  // nda-collab
  { archetype: "nda-collab", weight: 1.0, anyOf: ["nda", "non-disclosure", "confidentiality agreement", "topline", "remote co-write"] },
];

export function keywordClassify(text: string): { slug: ArchetypeSlug; confidence: number }[] {
  const t = text.toLowerCase();
  const scores = new Map<ArchetypeSlug, number>();
  for (const rule of RULES) {
    if (rule.anyOf.some((kw) => t.includes(kw))) {
      scores.set(rule.archetype, Math.max(scores.get(rule.archetype) ?? 0, rule.weight));
    }
  }
  if (scores.size === 0) return [];
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([slug, weight]) => ({ slug, confidence: Math.min(0.7, weight * 0.7) })); // cap fallback confidence at 0.7
}
