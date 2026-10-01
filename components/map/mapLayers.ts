import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapLayerId } from "@/lib/mapLayerCommand";

/**
 * Base layers for the property map. The providers mirror the ones the `maps/` stack
 * settled on — Esri World Imagery for satellite, an open DEM for terrain — chosen here as
 * MapLibre sources so the app keeps one map engine instead of two.
 */
export type { MapLayerId };

const SATELLITE_SOURCE = "pando-satellite";
const SATELLITE_LAYER = "pando-satellite-raster";
const DEM_SOURCE = "pando-dem";
const HILLSHADE_LAYER = "pando-hillshade";

/** Esri World Imagery — the same service `maps/imagery.js` uses, as XYZ tiles. */
const SATELLITE_TILES =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION =
  'Powered by <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> — Esri, Maxar, Earthstar Geographics';

/** Terrarium-encoded elevation, AWS Open Data. Keyless, like the rest of the map stack. */
const DEM_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const DEM_ATTRIBUTION =
  '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain Tiles</a> — Mapzen, AWS Open Data';

/**
 * The style's own ground layers, captured once the brand grade has run so the clutter it
 * hid stays hidden. Satellite replaces these; labels and the property glow stay on top.
 */
export function collectBaseLayers(map: MapLibreMap): string[] {
  return (map.getStyle().layers ?? [])
    .filter((l) => l.type !== "symbol" && map.getLayoutProperty(l.id, "visibility") !== "none")
    .map((l) => l.id);
}

/** First label layer: imagery and hillshade go under it, so place names keep reading. */
function firstSymbolId(map: MapLibreMap): string | undefined {
  return (map.getStyle().layers ?? []).find((l) => l.type === "symbol")?.id;
}

function setVisible(map: MapLibreMap, id: string, visible: boolean) {
  if (!map.getLayer(id)) return;
  try {
    map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  } catch {}
}

/** Sources are added the first time their layer is picked, never on load: no wasted tiles. */
function ensureSatellite(map: MapLibreMap) {
  if (map.getSource(SATELLITE_SOURCE)) return;
  map.addSource(SATELLITE_SOURCE, {
    type: "raster",
    tiles: [SATELLITE_TILES],
    tileSize: 256,
    maxzoom: 19,
    attribution: SATELLITE_ATTRIBUTION,
  });
  map.addLayer(
    {
      id: SATELLITE_LAYER,
      type: "raster",
      source: SATELLITE_SOURCE,
      paint: {
        "raster-opacity": 1,
        // Raw Esri imagery is cold and nearly black over the Gulf. Lifting the floor,
        // easing contrast and warming the hue settles it into the brand palette and keeps
        // the coral pins and cream labels legible on top.
        "raster-brightness-min": 0.08,
        "raster-brightness-max": 0.94,
        "raster-saturation": -0.22,
        "raster-contrast": -0.06,
        "raster-hue-rotate": 8,
      },
    },
    firstSymbolId(map),
  );
}

function ensureTerrain(map: MapLibreMap) {
  if (map.getSource(DEM_SOURCE)) return;
  map.addSource(DEM_SOURCE, {
    type: "raster-dem",
    tiles: [DEM_TILES],
    encoding: "terrarium",
    tileSize: 256,
    maxzoom: 14,
    attribution: DEM_ATTRIBUTION,
  });
  map.addLayer(
    {
      id: HILLSHADE_LAYER,
      type: "hillshade",
      source: DEM_SOURCE,
      paint: {
        // Warm shadow, cream highlight: relief that reads as part of the brand grade.
        "hillshade-shadow-color": "#9c6a63",
        "hillshade-highlight-color": "#fff6f1",
        "hillshade-accent-color": "#c98f7c",
        "hillshade-exaggeration": 0.45,
      },
    },
    firstSymbolId(map),
  );
}

/** Every place name on the map; they have to be regraded when the ground under them changes. */
const LABEL_LAYERS = [
  "label_other",
  "label_village",
  "label_town",
  "label_city",
  "label_city_capital",
  "highway-name-major",
  "highway-name-minor",
  "water_name_point_label",
  "water_name_line_label",
];

/** Plum on a cream halo over the brand map; cream on a deep plum halo over imagery. */
const LABEL_GRADE: Record<"light" | "dark", { color: string; halo: string; width: number }> = {
  light: { color: "#4b2b3b", halo: "#fff8f4", width: 1.6 },
  dark: { color: "#fff6f1", halo: "rgba(40, 14, 30, 0.9)", width: 1.9 },
};

/**
 * Labels are printed on whatever the layer puts underneath them. Esri imagery is dark and
 * busy, so plum-on-cream stops reading: over satellite the type inverts to cream on a deep
 * plum halo, and the road names lighten to match.
 */
function gradeLabels(map: MapLibreMap, layer: MapLayerId) {
  const grade = LABEL_GRADE[layer === "satellite" ? "dark" : "light"];
  const roadColor = layer === "satellite" ? "#ffd9c8" : "#7a4a3c";
  const waterColor = layer === "satellite" ? "#dcd2ec" : "#5e3d53";
  for (const id of LABEL_LAYERS) {
    if (!map.getLayer(id)) continue;
    try {
      const color = id.startsWith("highway-name")
        ? roadColor
        : id.startsWith("water_name")
          ? waterColor
          : grade.color;
      map.setPaintProperty(id, "text-color", color);
      map.setPaintProperty(id, "text-halo-color", grade.halo);
      // Road names carry a slightly tighter halo on the brand map, as the base grade set them.
      map.setPaintProperty(id, "text-halo-width", layer === "satellite" ? grade.width : id.startsWith("highway-name") ? 1.4 : 1.6);
    } catch {}
  }
}

/**
 * Switch the base layer. Safe to call on any map state — a missing layer is skipped, so a
 * style update can never break the control.
 */
export function applyMapLayer(map: MapLibreMap, layer: MapLayerId, baseLayerIds: string[]) {
  if (layer === "satellite") ensureSatellite(map);
  if (layer === "terrain") ensureTerrain(map);

  gradeLabels(map, layer);

  setVisible(map, SATELLITE_LAYER, layer === "satellite");
  setVisible(map, HILLSHADE_LAYER, layer === "terrain");
  for (const id of baseLayerIds) setVisible(map, id, layer !== "satellite");

  try {
    map.setTerrain(layer === "terrain" ? { source: DEM_SOURCE, exaggeration: 1.6 } : null);
  } catch {
    // No terrain support (or the DEM failed): the layer still renders flat with hillshade.
  }
}
