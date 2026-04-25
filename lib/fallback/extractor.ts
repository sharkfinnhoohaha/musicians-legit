// Deterministic field extractor: regex + heuristics. No AI required.

export type ExtractedFields = {
  parties: { role: string; name: string | null }[];
  percentages: Record<string, number>;
  monetary: Record<string, number>;
  termMonths: number | null;
  missingFields: string[];
};

const PERCENT_RE = /(\d{1,3}(?:\.\d{1,2})?)\s*%/g;
const MONEY_RE = /\$\s*([\d,]+(?:\.\d{2})?)/g;
const MONTHS_RE = /(\d+)\s*(?:month|months|mo)\b/i;
const YEARS_RE = /(\d+)\s*(?:year|years|yr)\b/i;

// Capture phrases like "between Alice and Bob" or "with my friend Sam"
const PARTY_PATTERNS = [
  /\bbetween\s+([A-Z][\w'\-]+(?:\s+[A-Z][\w'\-]+)?)\s+and\s+([A-Z][\w'\-]+(?:\s+[A-Z][\w'\-]+)?)/g,
  /\bwith\s+(?:my\s+(?:friend|producer|manager|engineer|bandmate|cowriter)\s+)?([A-Z][\w'\-]+(?:\s+[A-Z][\w'\-]+)?)/g,
];

export function extractFields(text: string): ExtractedFields {
  const fields: ExtractedFields = {
    parties: [],
    percentages: {},
    monetary: {},
    termMonths: null,
    missingFields: [],
  };

  // Percentages
  let m: RegExpExecArray | null;
  let pIdx = 0;
  while ((m = PERCENT_RE.exec(text)) !== null) {
    fields.percentages[`pct_${pIdx++}`] = parseFloat(m[1]);
  }

  // Money
  let mIdx = 0;
  while ((m = MONEY_RE.exec(text)) !== null) {
    fields.monetary[`amount_${mIdx++}`] = parseFloat(m[1].replace(/,/g, ""));
  }

  // Term
  const monthsMatch = text.match(MONTHS_RE);
  const yearsMatch = text.match(YEARS_RE);
  if (monthsMatch) fields.termMonths = parseInt(monthsMatch[1]);
  else if (yearsMatch) fields.termMonths = parseInt(yearsMatch[1]) * 12;

  // Parties
  for (const re of PARTY_PATTERNS) {
    let pm: RegExpExecArray | null;
    while ((pm = re.exec(text)) !== null) {
      if (pm[1]) fields.parties.push({ role: "party", name: pm[1] });
      if (pm[2]) fields.parties.push({ role: "party", name: pm[2] });
    }
  }
  // Dedupe by name
  const seen = new Set<string>();
  fields.parties = fields.parties.filter((p) => {
    if (!p.name || seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });

  // Heuristic missing-field flags
  if (fields.parties.length < 2) fields.missingFields.push("party_names");
  if (Object.keys(fields.percentages).length === 0) fields.missingFields.push("percentages_or_splits");
  if (fields.termMonths === null && /\b(term|duration|how long)\b/i.test(text)) {
    fields.missingFields.push("term_length");
  }

  return fields;
}
