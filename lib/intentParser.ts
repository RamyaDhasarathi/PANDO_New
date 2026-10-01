import type { Lifestyle } from "@/data/properties";
import { formatAed } from "./format";

export type ListingMode = "buy" | "rent";

export interface SearchPreferences {
  propertyType?: "apartment" | "villa";
  location?: string;
  /** Maximum budget in AED. */
  budget?: number;
  /** Minimum budget in AED ("above 5M"). */
  budgetMin?: number;
  bedrooms?: number;
  lifestyle?: Lifestyle[];
  query?: string;
}

/** Most specific first, so "Emaar Beachfront, near the Marina" resolves to Beachfront. */
const AREA_ALIASES: Array<[RegExp, string]> = [
  [/emaar beachfront|\bbeachfront\b/, "Emaar Beachfront"],
  [/\bjbr\b|jumeirah beach residence|\bthe walk\b/, "JBR"],
  [/\bmarina\b/, "Dubai Marina"],
  [/\bpalm\b/, "Palm Jumeirah"],
  [/business bay|\bcanal\b/, "Business Bay"],
  [/\bdowntown\b|\bburj\b|dubai mall|\bboulevard\b|\bdifc\b/, "Downtown Dubai"],
  [/dubai hills|\bhills\b/, "Dubai Hills Estate"],
  [/arabian ranches|\branches\b/, "Arabian Ranches"],
  [/\bcreek\b/, "Dubai Creek Harbour"],
  [/\bjvc\b|jumeirah village/, "Jumeirah Village Circle"],
];

const LIFESTYLE_WORDS: Array<[RegExp, Lifestyle]> = [
  [/beach|sea\b|seaside|waterfront|coast/, "beach"],
  [/famil(?:y|ies)|kids|children|school/, "family"],
  [/modern|contemporary|sleek|new build/, "modern"],
  [/spacious|large|big|roomy/, "spacious"],
  [/quiet|calm|peaceful|green|park/, "quiet"],
  [/luxury|luxurious|premium|high[- ]end/, "luxury"],
  [/\bview/, "view"],
  [/\bpool\b/, "pool"],
  [/affordable|cheap|value|budget friendly/, "value"],
  [/off[- ]?plan|new launch/, "offplan"],
];

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

/** Every community mentioned, in the order the user said them ("Marina or Dubai Hills?"). */
export function parseAreas(input: string): string[] {
  const text = input.toLowerCase();
  const found: Array<[index: number, area: string]> = [];
  for (const [pattern, area] of AREA_ALIASES) {
    const m = pattern.exec(text);
    if (m && !found.some(([, a]) => a === area)) found.push([m.index, area]);
  }
  return found.sort((a, b) => a[0] - b[0]).map(([, area]) => area);
}

/** "to rent", "per year" → rent; "buy", "purchase", "invest" → buy. */
export function parseListingMode(input: string): ListingMode | undefined {
  const text = input.toLowerCase();
  if (/\b(rent|renting|rental|lease|leasing|per (?:year|annum)|a year|yearly)\b/.test(text)) return "rent";
  if (/\b(buy|buying|purchase|own|invest|investment|for sale)\b/.test(text)) return "buy";
  return undefined;
}

function parseMoney(amount: string, unit: string | undefined): number {
  const n = parseFloat(amount.replace(/,/g, ""));
  const u = (unit ?? "").toLowerCase();
  if (u.startsWith("m")) return Math.round(n * 1_000_000);
  if (u.startsWith("k") || u.startsWith("t")) return Math.round(n * 1_000);
  // Bare numbers under 100 are almost always millions in Dubai sales talk.
  return n < 100 ? Math.round(n * 1_000_000) : Math.round(n);
}

/** Deterministically extracts search preferences from free text. */
export function parseIntent(input: string): SearchPreferences {
  const text = input.toLowerCase();
  const prefs: SearchPreferences = { query: input.trim() };

  if (/villa|townhouse|house\b/.test(text)) prefs.propertyType = "villa";
  else if (/apartment|flat|studio|penthouse|loft|condo/.test(text))
    prefs.propertyType = "apartment";

  const bedDigits = text.match(/(\d+)\s*(?:-|\s)?\s*(?:bed(?:room)?s?|br\b|bhk)/);
  const bedWords = text.match(
    /\b(one|two|three|four|five|six)[\s-]*(?:bed(?:room)?s?|br\b)/,
  );
  if (bedDigits) prefs.bedrooms = parseInt(bedDigits[1], 10);
  else if (bedWords) prefs.bedrooms = NUMBER_WORDS[bedWords[1]];
  else if (/\bstudio\b/.test(text)) prefs.bedrooms = 0;

  // Budget: "under AED 2M", "2 million", "aed 1,800,000", "150k", "2-5M".
  const range = text.match(
    /(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(m\b|mn\b|mil\b|million|k\b|thousand)/,
  );
  if (range) {
    prefs.budgetMin = parseMoney(range[1], range[3]);
    prefs.budget = parseMoney(range[2], range[3]);
  } else {
    const money =
      text.match(/(?:aed|dhs?|dirhams?)\s*(\d[\d,]*(?:\.\d+)?)\s*(m\b|mn\b|mil\b|million|k\b|thousand)?/) ??
      text.match(/(\d[\d,]*(?:\.\d+)?)\s*(m\b|mn\b|mil\b|million|k\b|thousand)/) ??
      // "under 1,800,000" / "budget of 150000": a bare amount after a budget word.
      text.match(/(?:under|below|up to|max(?:imum)?|budget(?: of| is)?|around|within)\s*(\d{1,3}(?:,\d{3})+|\d{5,})()/);
    if (money) {
      const value = parseMoney(money[1], money[2]);
      const before = text.slice(0, money.index ?? 0);
      if (/(above|over|more than|at least|from|\+)\s*(aed\s*)?$/.test(before) || /\+/.test(text.slice((money.index ?? 0) + money[0].length, (money.index ?? 0) + money[0].length + 1))) {
        prefs.budgetMin = value;
      } else {
        prefs.budget = value;
      }
    }
  }

  for (const [pattern, area] of AREA_ALIASES) {
    if (pattern.test(text)) {
      prefs.location = area;
      break;
    }
  }

  const lifestyle = new Set<Lifestyle>();
  for (const [pattern, tag] of LIFESTYLE_WORDS) {
    // "Emaar Beachfront" is a place, not a lifestyle ask.
    if (tag === "beach" && prefs.location === "Emaar Beachfront" && !/beach\b(?!front)|sea\b/.test(text)) continue;
    if (pattern.test(text)) lifestyle.add(tag);
  }
  if (lifestyle.size) prefs.lifestyle = [...lifestyle];

  return prefs;
}

export function hasPreferences(p: SearchPreferences): boolean {
  return Boolean(
    p.propertyType ||
      p.location ||
      p.budget ||
      p.budgetMin ||
      p.bedrooms !== undefined ||
      p.lifestyle?.length,
  );
}

/** Later answers win; lifestyle keywords accumulate. */
export function mergePreferences(
  base: SearchPreferences,
  next: SearchPreferences,
): SearchPreferences {
  const lifestyle = [...new Set([...(base.lifestyle ?? []), ...(next.lifestyle ?? [])])];
  const merged: SearchPreferences = { ...base };
  if (next.propertyType) merged.propertyType = next.propertyType;
  if (next.location) merged.location = next.location;
  if (next.bedrooms !== undefined) merged.bedrooms = next.bedrooms;
  if (next.budget !== undefined || next.budgetMin !== undefined) {
    merged.budget = next.budget;
    merged.budgetMin = next.budgetMin;
  }
  if (lifestyle.length) merged.lifestyle = lifestyle;
  if (next.query) merged.query = next.query;
  return merged;
}

const LIFESTYLE_ADJECTIVE: Partial<Record<Lifestyle, string>> = {
  modern: "modern",
  spacious: "spacious",
  family: "family-friendly",
  luxury: "luxury",
  quiet: "quiet",
  offplan: "off-plan",
  value: "great-value",
};

export function shortArea(area: string): string {
  return area
    .replace(" Dubai", "")
    .replace(" Estate", "")
    .replace("Jumeirah Village Circle", "JVC");
}

/** "a modern 2-bedroom apartment around Downtown within AED 2M" */
export function describePreferences(p: SearchPreferences, mode: ListingMode = "buy"): string {
  const adjectives = (p.lifestyle ?? [])
    .map((l) => LIFESTYLE_ADJECTIVE[l])
    .filter(Boolean)
    .slice(0, 2);
  const parts: string[] = [];
  if (adjectives.length) parts.push(adjectives.join(", "));
  if (p.bedrooms !== undefined) parts.push(p.bedrooms === 0 ? "studio" : `${p.bedrooms}‑bedroom`); // non-breaking hyphen
  parts.push(p.propertyType ?? "home");
  let phrase = parts.join(" ");
  if (p.location) phrase += ` near ${shortArea(p.location)}`;
  if (p.lifestyle?.includes("beach")) phrase += " near the beach";
  if (p.lifestyle?.includes("view") && !p.lifestyle.includes("beach")) phrase += " with a view";
  if (p.lifestyle?.includes("pool")) phrase += " with a pool";
  const per = mode === "rent" ? " a year" : "";
  if (p.budgetMin && p.budget) phrase += ` between ${formatAed(p.budgetMin)} and ${formatAed(p.budget)}${per}`;
  else if (p.budget) phrase += ` within ${formatAed(p.budget)}${per}`;
  else if (p.budgetMin) phrase += ` from ${formatAed(p.budgetMin)}${per}`;
  if (mode === "rent") phrase += " to rent";
  const article = /^[aeiou]/.test(phrase) ? "an" : "a";
  return `${article} ${phrase}`;
}
