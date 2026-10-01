import { properties, type Lifestyle, type Property } from "@/data/properties";
import { formatAed } from "./format";
import { shortArea, type ListingMode, type SearchPreferences } from "./intentParser";

export interface Recommendation {
  property: Property;
  /** 0–100, shown as "92% match". */
  match: number;
  reasons: string[];
}

export interface RecommendationResult {
  /** Increments per generated set so the UI can swap old cards for new ones. */
  id?: number;
  items: Recommendation[];
  /** True when nothing met the hard filters and we fell back to the closest homes. */
  relaxed: boolean;
}

const LIFESTYLE_REASON: Record<Lifestyle, string> = {
  beach: "Close to the beach",
  family: "Family friendly community",
  modern: "Modern interior",
  spacious: "Spacious layout",
  quiet: "Quiet, green surroundings",
  luxury: "Luxury finishes",
  view: "Great views",
  pool: "Private or shared pool",
  value: "Great value",
  offplan: "Off-plan payment plan",
};

export function priceFor(p: Property, mode: ListingMode): number {
  return mode === "rent" ? p.rentPerYear : p.price;
}

function evaluate(p: Property, prefs: SearchPreferences, mode: ListingMode) {
  const reasons: string[] = [];
  let score = 0;
  let max = 0;
  let hardMiss = false;
  const price = priceFor(p, mode);

  if (prefs.propertyType) {
    max += 3;
    if (p.type.toLowerCase() === prefs.propertyType) {
      score += 3;
    } else hardMiss = true;
  }

  if (prefs.location) {
    max += 3;
    if (p.location === prefs.location) {
      score += 3;
      reasons.push(`In ${shortArea(p.location)}`);
    } else if (p.nearby.includes(prefs.location)) {
      score += 1.8;
      reasons.push(`Near ${shortArea(prefs.location)}`);
    } else hardMiss = true;
  }

  if (prefs.bedrooms !== undefined) {
    max += 2;
    if (p.bedrooms === prefs.bedrooms) {
      score += 2;
      reasons.push(prefs.bedrooms === 0 ? "Studio layout" : `${p.bedrooms} bedrooms`);
    } else if (p.bedrooms === prefs.bedrooms + 1) {
      score += 1;
      reasons.push(`${p.bedrooms} bedrooms — room to grow`);
    } else if (p.bedrooms < prefs.bedrooms) hardMiss = true;
  }

  if (prefs.budget !== undefined) {
    max += 2;
    if (price <= prefs.budget) {
      score += 2;
      reasons.push("Within budget");
    } else if (price <= prefs.budget * 1.1) {
      score += 0.8;
      reasons.push(`Just ${formatAed(price - prefs.budget)} over budget`);
    } else hardMiss = true;
  }
  if (prefs.budgetMin !== undefined) {
    max += 1;
    if (price >= prefs.budgetMin) score += 1;
    else hardMiss = true;
  }

  for (const tag of prefs.lifestyle ?? []) {
    max += 1.5;
    if (p.lifestyle.includes(tag)) {
      score += 1.5;
      reasons.push(LIFESTYLE_REASON[tag]);
    }
  }

  if (!prefs.lifestyle?.includes("offplan") && p.offPlan && mode === "rent") hardMiss = true;

  const match = max === 0 ? 70 : Math.round(50 + (score / max) * 48);
  return { score, max, hardMiss, match, reasons };
}

const MAX_MATCHES = 6;

/** Scores every mock property against the preferences Pando collected. */
export function recommend(prefs: SearchPreferences, mode: ListingMode): RecommendationResult {
  const scored = properties.map((property) => ({ property, ...evaluate(property, prefs, mode) }));
  const strong = scored
    .filter((s) => !s.hardMiss && (s.max === 0 || s.score > 0))
    .sort((a, b) => b.score - a.score || priceFor(a.property, mode) - priceFor(b.property, mode));

  // Only genuine matches: the map shows exactly these and hides everything else.
  if (strong.length) {
    return {
      relaxed: false,
      items: strong.slice(0, MAX_MATCHES).map(({ property, match, reasons }) => ({
        property,
        match,
        reasons: reasons.length ? reasons.slice(0, 4) : property.tags.slice(0, 3),
      })),
    };
  }

  const closest = [...scored].sort((a, b) => b.score - a.score).slice(0, 3);
  return {
    relaxed: true,
    items: closest.map(({ property, match, reasons }) => ({
      property,
      match: Math.min(match, 74),
      reasons: reasons.length ? reasons.slice(0, 3) : property.tags.slice(0, 3),
    })),
  };
}

/** Scores one home against the current conversation, e.g. to pin the saved shortlist. */
export function scoreProperty(property: Property, prefs: SearchPreferences, mode: ListingMode): Recommendation {
  const { match, reasons } = evaluate(property, prefs, mode);
  return { property, match, reasons: reasons.length ? reasons.slice(0, 4) : defaultReasons(property) };
}

/** Reasons shown in the modal for a home that wasn't part of a search. */
export function defaultReasons(p: Property): string[] {
  return [
    ...p.lifestyle.slice(0, 3).map((l) => LIFESTYLE_REASON[l]),
    `${p.bedrooms} bedrooms, ${p.bathrooms} bathrooms`,
  ];
}
