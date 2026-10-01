import { AREAS, type AreaAdvice } from "@/data/areas";
import type { Lifestyle, Property } from "@/data/properties";
import { parseAreas, type ListingMode, type SearchPreferences } from "./intentParser";
import { recommend, type Recommendation, type RecommendationResult } from "./recommend";

/**
 * Pando as an area advisor: recognises questions *about* a community (rather than a
 * search for homes in it), answers from local knowledge in data/areas.ts, and explains
 * why the homes it pins fit. Deterministic and offline, like the intent parser.
 */

export type AdviceTopic = "overview" | "lifestyle" | "investment" | "price" | "compare";

export interface AreaQuestion {
  areas: AreaAdvice[];
  topic: AdviceTopic;
  /** For "is JVC good for families?": the lifestyle being asked about. */
  lifestyle?: Lifestyle;
}

/** Wording that marks a question about a place rather than a request for listings. */
const ASKING =
  /\b(what'?s|what is|what are|what about|how'?s|how is|how are|tell me|thoughts|opinion|like to live|like living|vibe|good for|good place|worth|should i|is it|compare|versus|vs\.?|difference|better|safe|expensive|pricey|cheap|afford|invest(?:ment|ing)?|yields?|roi|rental returns?|recommend)\b/;

const TOPIC: Array<[RegExp, AdviceTopic]> = [
  [/\b(invest(?:ment|ing|or)?|yields?|roi|returns?|rental income|capital growth|appreciat)/, "investment"],
  [/\b(expensive|pricey|cheap|afford|prices?|cost)\b/, "price"],
];

/** Follow-ups that lean on the area already being discussed: "is it good for families?" */
const ABOUT_CURRENT = /\b(it|there|this area|that area|the area|the neighbou?rhood|this community|that community)\b/;

export function parseAreaQuestion(
  input: string,
  parsed: SearchPreferences,
  /** The area in the conversation right now, for follow-ups that don't name one. */
  currentArea?: string,
): AreaQuestion | null {
  const text = input.toLowerCase();
  let areas = parseAreas(text).map((a) => AREAS[a as keyof typeof AREAS]).filter(Boolean);
  const current = currentArea ? AREAS[currentArea as keyof typeof AREAS] : undefined;
  if (!areas.length && current && ABOUT_CURRENT.test(text)) areas = [current];
  if (!areas.length || !ASKING.test(text)) return null;
  // Bedrooms or a budget make it a search ("what 2 beds are there in Marina?").
  if (parsed.bedrooms !== undefined || parsed.budget !== undefined || parsed.budgetMin !== undefined) return null;

  if (areas.length > 1) return { areas: areas.slice(0, 2), topic: "compare" };
  const topic = TOPIC.find(([pattern]) => pattern.test(text))?.[1];
  if (topic) return { areas, topic };
  const lifestyle = parsed.lifestyle?.[0];
  if (lifestyle) return { areas, topic: "lifestyle", lifestyle };
  return { areas, topic: "overview" };
}

const LIFESTYLE_LABEL: Record<Lifestyle, string> = {
  family: "family life",
  beach: "beach living",
  quiet: "peace and quiet",
  luxury: "luxury living",
  value: "value for money",
  modern: "modern living",
  spacious: "space",
  view: "views",
  pool: "pool-side living",
  offplan: "buying off-plan",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Pando's spoken answer: two short sentences at most. */
export function answer(q: AreaQuestion): string {
  const [a, b] = q.areas;
  switch (q.topic) {
    case "compare":
      return `${cap(a.short)} is ${a.vibe}; ${b.short} is ${b.vibe}. The trade-off with ${a.short}: ${a.tradeoffs[0]}.`;
    case "investment":
      return a.investment;
    case "price":
      return a.price;
    case "lifestyle": {
      const l = q.lifestyle!;
      if (a.lifestyles.includes(l)) {
        return `Yes, ${a.short} is a good fit for ${LIFESTYLE_LABEL[l]}, with ${a.strengths[0]}. The trade-off: ${a.tradeoffs[0]}.`;
      }
      const alt = Object.values(AREAS).find((x) => x.lifestyles[0] === l) ?? Object.values(AREAS).find((x) => x.lifestyles.includes(l));
      return `${cap(a.short)} isn't really the place for ${LIFESTYLE_LABEL[l]}: ${a.tradeoffs[0]}.${alt ? ` ${cap(alt.short)} suits that better.` : ""}`;
    }
    default:
      return a.brief;
  }
}

/** Homes to pin for the answer: in the area first, shaped by what the user already said. */
export function adviceResults(q: AreaQuestion, prefs: SearchPreferences, mode: ListingMode): RecommendationResult {
  const perArea = q.areas.length > 1 ? 3 : 4;
  const items = q.areas.flatMap((a) => {
    const lifestyle = q.lifestyle ? [q.lifestyle] : prefs.lifestyle;
    let r = recommend({ ...prefs, lifestyle, location: a.area }, mode);
    // Earlier filters rule everything out: fall back to the area on its own.
    if (r.relaxed) r = recommend({ location: a.area }, mode);
    const inside = r.items.filter((i) => i.property.location === a.area);
    return (inside.length ? inside : r.items).slice(0, perArea);
  });
  const unique = items.filter((item, i) => items.findIndex((x) => x.property.id === item.property.id) === i);
  return { relaxed: false, items: unique };
}

const FIT: Record<Lifestyle, string> = {
  family: "family space",
  quiet: "quiet, green surroundings",
  value: "great value",
  luxury: "luxury finishes",
  beach: "beach access",
  view: "the views",
  pool: "its pool",
  modern: "a modern finish",
  spacious: "extra space",
  offplan: "its payment plan",
};

/** "Parkway Vistas Villa" → "Parkway Vistas" */
const shortName = (p: Property) => p.name.replace(/\s(Apartment|Residences?|Villa|Tower|Studio|Townhouse)$/, "");

/**
 * Why a pinned home fits: the lifestyle asked about, else one of the area's strengths
 * the home actually has. Skips reasons already given so two homes don't sound the same.
 */
function fitFor(item: Recommendation, q: AreaQuestion, used: Set<Lifestyle>): string {
  const p = item.property;
  const area = q.areas.find((a) => a.area === p.location) ?? q.areas[0];
  const fresh = (l: Lifestyle) => !used.has(l);
  const tag =
    (q.lifestyle && p.lifestyle.includes(q.lifestyle) && fresh(q.lifestyle) ? q.lifestyle : undefined) ??
    p.lifestyle.find((l) => area.lifestyles.includes(l) && fresh(l)) ??
    p.lifestyle.find(fresh);
  if (!tag) return `${shortName(p)} for ${p.tags[0].toLowerCase()}`;
  used.add(tag);
  return `${shortName(p)} for ${FIT[tag]}`;
}

/** "On the map: Parkway Vistas for its pool, Park Heights for family space." */
export function fitNote(result: RecommendationResult, q: AreaQuestion): string {
  const n = result.items.length;
  if (!n) return `I don't have homes listed in ${q.areas[0].short} right now.`;
  const used = new Set<Lifestyle>();
  // Comparing two areas: cite one home from each.
  const picks =
    q.areas.length > 1
      ? q.areas.flatMap((a) => result.items.find((i) => i.property.location === a.area) ?? [])
      : result.items.slice(0, 2);
  const parts = picks.map((item) => fitFor(item, q, used));
  const more = n > parts.length ? `, plus ${n - parts.length} more` : "";
  return `On the map: ${parts.join(", ")}${more}.`;
}
