/**
 * The map's base layers as a spoken vocabulary. Pando and the on-map control share this
 * list, so "show me the satellite view" and tapping the control mean exactly the same thing.
 */
export type MapLayerId = "standard" | "satellite" | "terrain" | "photoreal";

export const MAP_LAYERS: Array<{
  id: MapLayerId;
  label: string;
  shortLabel: string;
  /** How Pando names it out loud. */
  spoken: string;
}> = [
  { id: "standard", label: "Default", shortLabel: "Map", spoken: "the default map" },
  { id: "satellite", label: "Satellite", shortLabel: "Sat", spoken: "satellite view" },
  { id: "terrain", label: "Terrain", shortLabel: "Relief", spoken: "terrain view" },
  { id: "photoreal", label: "3D Buildings", shortLabel: "3D", spoken: "the photorealistic 3D view" },
];

export const mapLayerName = (id: MapLayerId) => MAP_LAYERS.find((l) => l.id === id)?.spoken ?? "the map";

const KEYWORDS: Array<[RegExp, MapLayerId]> = [
  [/\b(satellite|satelite|sattelite|aerial|imagery|bird'?s[- ]eye|from (?:the )?(?:sky|air|above))\b/, "satellite"],
  // Checked before "terrain": "3d" now means the photorealistic mesh, not hillshade relief.
  [/\b(3d|three[- ]?d|photoreal\w*|realistic|google earth)\b/, "photoreal"],
  [/\b(terrain|topograph\w*|relief|elevation|contours?|hillshade)\b/, "terrain"],
  [/\b(default|standard|normal|plain|classic|street|road)\s+(view|map|layer|mode)\b|\b(?:default|standard|normal)\s+again\b/, "standard"],
];

/** Words that mean the user is talking about the map itself, not about homes. */
const SWITCH = /\b(switch|change|show|turn|put|give|go|set|enable|use|display|open|back to)\b/;
const MAP_NOUN = /\b(view|layer|mode|imagery|map)\b/;

/**
 * A layer instruction, or null. Deliberately narrow: it needs a layer word *and* either a
 * switching verb, a map noun, or a very short utterance ("satellite"), so a property search
 * like "show me the second one" or "a 3 bed villa" is never mistaken for one.
 */
export function parseMapLayerCommand(input: string): MapLayerId | null {
  const text = input.toLowerCase().trim();
  const hit = KEYWORDS.find(([pattern]) => pattern.test(text));
  if (!hit) return null;
  const brief = text.split(/\s+/).length <= 3;
  if (SWITCH.test(text) || MAP_NOUN.test(text) || brief) return hit[1];
  return null;
}
