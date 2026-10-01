import type { Property } from "@/data/properties";
import { formatAed, formatArea } from "./format";
import { parseAreas, shortArea, type ListingMode, type SearchPreferences } from "./intentParser";
import { priceFor, type Recommendation } from "./recommend";

/**
 * Voice commands about the homes Pando has pinned: "tell me about the first one",
 * "why did you recommend this?", "compare the first and third", "show me that one",
 * "go back". References resolve against the visible recommendation set, in the same
 * order as the numbers on the map pins.
 */

export type PropertyIntent = "describe" | "why" | "compare" | "open" | "back" | "save" | "unsave";

type Ref =
  | { kind: "index"; index: number }
  | { kind: "last" }
  | { kind: "this" }
  | { kind: "id"; id: string }
  | { kind: "cheapest" | "priciest" | "biggest" | "smallest" };

export interface PropertyCommand {
  intent: PropertyIntent;
  refs: Ref[];
}

const ORDINALS: Array<[RegExp, number]> = [
  [/\b(first|1st|top|best)\b/g, 0],
  [/\b(second|2nd)\b/g, 1],
  [/\b(third|3rd)\b/g, 2],
  [/\b(fourth|4th)\b/g, 3],
  [/\b(fifth|5th)\b/g, 4],
  [/\b(sixth|6th)\b/g, 5],
];
const NUMBER_WORD: Record<string, number> = { one: 0, two: 1, three: 2, four: 3, five: 4, six: 5 };

const SUPERLATIVES: Array<[RegExp, Extract<Ref, { kind: "cheapest" | "priciest" | "biggest" | "smallest" }>["kind"]]> = [
  [/\b(cheapest|least expensive|most affordable|lowest price)\b/g, "cheapest"],
  [/\b(most expensive|priciest|dearest)\b/g, "priciest"],
  [/\b(biggest|largest|most spacious)\b/g, "biggest"],
  [/\b(smallest|most compact)\b/g, "smallest"],
];

const DEICTIC = /\b(this|that|it|about it|about this|this one|that one|the (?:property|home|place|listing)|this (?:property|home|place|listing)|that (?:property|home|place|listing))\b/i;

const BACK =
  /^\s*(?:ok(?:ay)?,?\s*)?(?:please\s+)?(?:go|take me|get me|head)?\s*back\b|\bback to (?:the )?(?:map|results|recommendations|list|matches|search|pando)\b|\bclose (?:this|it|the (?:property|details|listing))\b|^\s*(?:exit|return|done)\s*$/i;
const UNSAVE = /\b(unsave|remove (?:it|this|that|\w+ one)? ?from (?:my )?(?:saved|shortlist|favou?rites)|forget (?:it|this|that))\b/i;
const SAVE = /\b(save|shortlist|keep|favou?rite|add (?:it|this|that|\w+ one)? ?to (?:my )?(?:saved|shortlist|favou?rites))\b/i;
const COMPARE = /\b(compare|versus|vs\.?|difference between|which is better)\b/i;
const WHY = /\bwhy\b/i;
const OPEN = /\b(show me|open|view|see|let'?s see|take me to|go to|pull up|full details|book a viewing|show)\b/i;
const DESCRIBE =
  /\b(explain(?: about| it| more)?|tell me (?:more |about )*|describe|details?(?: on| about)?|more (?:on|about)|info(?:rmation)? (?:on|about)|how about|what do you (?:think|know)|about)\b/i;

/** "Marina Quays Apartment" → "marina quays" */
const nameKey = (p: Property) =>
  p.name.toLowerCase().replace(/\s(apartment|residences?|villa|tower|studio|townhouse|suite|loft)$/, "");

function findRefs(text: string, candidates: Property[]): Ref[] {
  const found: Array<[pos: number, ref: Ref]> = [];
  for (const [pattern, index] of ORDINALS) {
    for (const m of text.matchAll(pattern)) found.push([m.index ?? 0, { kind: "index", index }]);
  }
  for (const m of text.matchAll(/(?:number|no\.?|#)\s*(\d|one|two|three|four|five|six)\b/g)) {
    const v = m[1];
    found.push([m.index ?? 0, { kind: "index", index: /\d/.test(v) ? Number(v) - 1 : NUMBER_WORD[v] }]);
  }
  for (const m of text.matchAll(/\b(last|final)\b/g)) found.push([m.index ?? 0, { kind: "last" }]);
  for (const [pattern, kind] of SUPERLATIVES) {
    for (const m of text.matchAll(pattern)) found.push([m.index ?? 0, { kind }]);
  }
  for (const p of candidates) {
    const at = text.indexOf(nameKey(p));
    if (at >= 0) found.push([at, { kind: "id", id: p.id }]);
  }
  return found.sort((a, b) => a[0] - b[0]).map(([, ref]) => ref);
}

/**
 * Returns a command when the words point at pinned homes, or when user asks to explain/show
 * the current results without starting an unrelated search.
 */
export function parsePropertyCommand(
  input: string,
  candidates: Property[],
  _searchPrefs: SearchPreferences,
): PropertyCommand | null {
  const text = input.toLowerCase().trim();
  if (BACK.test(text)) return { intent: "back", refs: [] };

  const refs = findRefs(text, candidates);
  const explicit = refs.some((r) => r.kind === "index" || r.kind === "last" || r.kind === "id");
  const pointing = refs.length > 0 || DEICTIC.test(text) || DESCRIBE.test(text) || OPEN.test(text) || WHY.test(text) || COMPARE.test(text);

  // Check if text is explicitly starting a NEW search with fresh criteria (new area or property type)
  // If we matched an explicit target property name or index, it's NOT a fresh search!
  const freshSearch = Boolean(
    !explicit && (
      parseAreas(text).length > 0 ||
        /villa|townhouse|apartment|studio|penthouse/.test(text) ||
        /under \d|below \d|above \d|budget of \d|\d+M|\d+k/.test(text)
    )
  );

  // If candidate homes exist on the map and user asks to open/show/explain a property,
  // execute it as a property command unless it's a fresh search for a new area.
  if (candidates.length > 0 && pointing && !freshSearch) {
    const target = refs.length ? refs : [{ kind: "this" } as Ref];
    if (OPEN.test(text)) return { intent: "open", refs: target };
    if (DESCRIBE.test(text) || DEICTIC.test(text)) return { intent: "describe", refs: target };
    if (WHY.test(text)) return { intent: "why", refs: target };
    if (COMPARE.test(text)) return { intent: "compare", refs: target };
  }

  if (explicit) {
    const target = refs;
    if (OPEN.test(text)) return { intent: "open", refs: target };
    if (DESCRIBE.test(text)) return { intent: "describe", refs: target };
    if (WHY.test(text)) return { intent: "why", refs: target };
    if (COMPARE.test(text)) return { intent: "compare", refs: target };
    return { intent: "describe", refs: target };
  }

  const target = refs.length ? refs : [{ kind: "this" } as Ref];
  // "Show my saved homes" is a list request, not a save; handled by the conversation.
  const listing = /\b(show|see|list|what are|open)\b.*\b(saved|shortlist|favou?rites)\b/.test(text) && !explicit;
  if (!listing && UNSAVE.test(text) && pointing) return { intent: "unsave", refs: target };
  if (!listing && SAVE.test(text) && (pointing || /^\s*(save|shortlist|keep) (it|this|that)/.test(text))) {
    return { intent: "save", refs: target };
  }
  if (COMPARE.test(text) && refs.length >= 1) return { intent: "compare", refs };
  if (WHY.test(text) && (pointing || /\brecommend|pick|choose|chose|suggest/.test(text))) {
    return { intent: "why", refs: refs.length ? refs : [{ kind: "this" }] };
  }
  if (!pointing) return null;
  const withThis = refs.length ? refs : [{ kind: "this" } as Ref];
  if (OPEN.test(text)) return { intent: "open", refs: withThis };
  if (DESCRIBE.test(text)) return { intent: "describe", refs: withThis };
  if (explicit && text.split(/\s+/).length <= 5) return { intent: "describe", refs };
  return null;
}

export type Resolved = { ok: true; items: Recommendation[] } | { ok: false; reason: string };

/** Maps references onto the visible set. `focus` is what "this"/"that" means right now. */
export function resolveRefs(
  refs: Ref[],
  visible: Recommendation[],
  focus: Recommendation[],
  mode: ListingMode,
): Resolved {
  if (!visible.length && !focus.length) {
    return { ok: false, reason: "I haven't pinned any homes yet. Tell me what you're looking for first." };
  }
  const pool = visible.length ? visible : focus;
  const by = (score: (r: Recommendation) => number) => [...pool].sort((a, b) => score(a) - score(b))[0];
  const items: Recommendation[] = [];
  for (const ref of refs) {
    let item: Recommendation | undefined;
    switch (ref.kind) {
      case "index":
        item = pool[ref.index];
        if (!item) {
          const n = pool.length;
          return {
            ok: false,
            reason: `I've only pinned ${n} ${n === 1 ? "home" : "homes"}. Try ${n === 1 ? "the first one" : `a number from 1 to ${n}`}.`,
          };
        }
        break;
      case "last":
        item = pool[pool.length - 1];
        break;
      case "this": {
        // If exactly 1 home is pinned, "it" or "this" unambiguously refers to that single home
        if (pool.length === 1) {
          item = pool[0];
          break;
        }
        // Otherwise, check if we have a currently focused property
        item = focus[focus.length - 1];
        if (!item) {
          if (pool.length > 1 && refs.length === 1) {
            return {
              ok: false,
              reason: `I've pinned ${pool.length} matching homes on the map. Which particular home would you like details on? Say a number from 1 to ${pool.length} (e.g. “the first one”), or tap its pin on the map.`,
            };
          }
          return {
            ok: false,
            reason: `Which home would you like details on? Say a number from 1 to ${pool.length} (e.g. “the first one”), or tap its pin on the map.`,
          };
        }
        break;
      }
      case "id":
        item = pool.find((r) => r.property.id === ref.id);
        break;
      case "cheapest":
        item = by((r) => priceFor(r.property, mode));
        break;
      case "priciest":
        item = by((r) => -priceFor(r.property, mode));
        break;
      case "biggest":
        item = by((r) => -r.property.areaSqft);
        break;
      case "smallest":
        item = by((r) => r.property.areaSqft);
        break;
    }
    if (item && !items.includes(item)) items.push(item);
  }
  return items.length ? { ok: true, items } : { ok: false, reason: "I couldn't tell which home you mean. Try “the first one”." };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function priceLabel(p: Property, mode: ListingMode) {
  return `${formatAed(priceFor(p, mode))}${mode === "rent" ? " a year" : ""}`;
}

/** "a 2-bed apartment in Marina for AED 1.78M" */
function summary(p: Property, mode: ListingMode) {
  const beds = p.bedrooms === 0 ? "studio" : `${p.bedrooms}-bed ${p.type.toLowerCase()}`;
  const article = /^[aeiou]/i.test(beds) ? "an" : "a";
  return `${article} ${beds} in ${shortArea(p.location)} for ${priceLabel(p, mode)}`;
}

export function describe(item: Recommendation, rank: number, mode: ListingMode): string {
  const p = item.property;
  const highlights = p.tags.slice(0, 2).map(lower);
  // rank 0: a home outside the current matches (e.g. from the saved list).
  const who = rank ? `Number ${rank}, ${p.name},` : p.name;
  return `${who} is ${summary(p, mode)}. Highlights: ${list(highlights)}.`;
}

export function explainWhy(item: Recommendation): string {
  const reasons = item.reasons.slice(0, 3).map(lower);
  return `I picked ${item.property.name} because it's a ${item.match}% match: ${list(reasons)}.`;
}

export function compare(a: Recommendation, b: Recommendation, mode: ListingMode): string {
  const [pa, pb] = [a.property, b.property];
  const facts = `${pa.name} is ${priceLabel(pa, mode)} for ${formatArea(pa.areaSqft)}; ${pb.name} is ${priceLabel(pb, mode)} for ${formatArea(pb.areaSqft)}.`;
  const cheaper = priceFor(pa, mode) <= priceFor(pb, mode) ? pa : pb;
  const bigger = pa.areaSqft >= pb.areaSqft ? pa : pb;
  const verdict =
    cheaper === bigger
      ? `${cheaper.name} is cheaper and bigger.`
      : `${cap(cheaper.name)} costs less; ${bigger.name} gives you more space.`;
  return `${facts} ${verdict}`;
}
