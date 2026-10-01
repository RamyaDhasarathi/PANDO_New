"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibreMap, Marker, setWorkerUrl, type ExpressionSpecification } from "maplibre-gl";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AREA_CENTERS, getProperty, type Property } from "@/data/properties";
import { DUBAI_CENTER, propertyGeoJSON, type PropertyFeature } from "@/data/propertyGeo";
import type { ListingMode } from "@/lib/intentParser";
import type { MapLayerId } from "@/lib/mapLayerCommand";
import { fitPoints } from "@/lib/mapCamera";
import { defaultReasons, type RecommendationResult } from "@/lib/recommend";
import MapLayerControl from "./MapLayerControl";
import { applyMapLayer, collectBaseLayers } from "./mapLayers";
import PropertyPin, { type PinState } from "./PropertyPin";

/** OpenFreeMap: open OpenMapTiles vector style, no key needed for the POC. */
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Served from public/ by scripts/copy-maplibre-worker.mjs (see predev/prebuild). */
const WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

/**
 * Turned so the coast runs left to right — the Gulf across the top, Marina on the left,
 * Creek Harbour on the right — with a gentle tilt for the 3D buildings.
 */
const CAMERA = { pitch: 50, bearing: -32 };
const ZOOM = { minZoom: 8, maxZoom: 17 };

/** The stage's design pixel (see --k in globals.css), so padding tracks the layout. */
function designPx(width: number, height: number) {
  if (width >= 1280) return Math.min(width / 1536, Math.max(height / 900, 0.62));
  if (width >= 1024) return Math.min(width / 1200, Math.max(height / 900, 0.62));
  return 1;
}

/**
 * Where the map should look. Padding keeps markers clear of the navbar and bubble (top)
 * and the search bar and strip (bottom); the welcome overview also stays below the hero
 * copy. For Pando's picks, if any would land behind Pando himself, they're framed in the
 * open space to his left instead (the hero copy has gone by then).
 */
/** Open space to Pando's left once the hero copy has gone; plain safe padding on small screens. */
function leftOfPando(width: number, height: number) {
  const k = designPx(width, height);
  if (width < 1024) return { top: 160, bottom: 220, left: 48, right: 48 };
  return { top: 200 * k, bottom: 260 * k, left: 130 * k, right: width / 2 + 210 * k };
}

function frame(map: MapLibreMap, features: PropertyFeature[], picks: boolean) {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const k = designPx(width, height);
  const points = features.map((f) => f.geometry.coordinates as [number, number]);
  const view = { ...CAMERA, minZoom: 10, maxZoom: 13.5 };
  // Side padding is generous for picks: the fit ignores perspective, and pins nearer the
  // viewer spread wider than predicted.
  const padding =
    width < 1024
      ? { top: 160, bottom: 220, left: 48, right: 48 }
      : picks
        ? { top: 200 * k, bottom: 260 * k, left: 190 * k, right: 190 * k }
        : { top: 420 * k, bottom: 200 * k, left: 90 * k, right: 90 * k };
  const full = fitPoints(points, { width, height }, { ...view, padding });
  if (!picks || width < 1024) return full;

  const behindPando = points.some((p) => {
    const [x, y] = full.project(p);
    return Math.abs(x - width / 2) < 200 * k && y > 150 * k && y < 680 * k;
  });
  if (!behindPando) return full;
  return fitPoints(points, { width, height }, { ...view, padding: leftOfPando(width, height) });
}

/** Camera flight while Pando is still thinking: swoop down onto the community that was asked for. */
function flyToArea(map: MapLibreMap, area: string, reduce: boolean) {
  const center = AREA_CENTERS[area as keyof typeof AREA_CENTERS];
  if (!center) return;
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  map.flyTo({
    center,
    zoom: 13.6,
    pitch: 56,
    bearing: CAMERA.bearing,
    padding: leftOfPando(width, height),
    duration: reduce ? 0 : 2400,
    curve: 1.5,
    essential: true,
  });
}

/** Brand grade for the Liberty style: blush land, mauve water, mint parks, soft 3D buildings. */
type PaintArgs = Parameters<MapLibreMap["setPaintProperty"]>;

const PLUM = "#4b2b3b";
const HALO = "#fff8f4";

/**
 * Warm, legible and clearly a map: cream land with enough contrast for white streets,
 * coral-toned arterials, deeper mauve water and mint parks, plum labels.
 */
const PAINT: Array<[layer: string, prop: PaintArgs[1], value: PaintArgs[2]]> = [
  ["background", "background-color", "#f3e2da"],
  ["landuse_residential", "fill-color", "#eed5cc"],
  ["landcover_sand", "fill-color", "#f1dfcf"],
  ["park", "fill-color", "#c9e6c3"],
  ["landcover_grass", "fill-color", "#d0e9c8"],
  ["landcover_wood", "fill-color", "#bfe0b8"],
  ["water", "fill-color", "#cbb3c3"],
  ["waterway_river", "line-color", "#c3a9bb"],
  ["waterway_other", "line-color", "#c3a9bb"],
  ["road_motorway", "line-color", "#e98e6f"],
  ["road_motorway_link", "line-color", "#ee9f83"],
  ["road_trunk_primary", "line-color", "#f3b39c"],
  ["road_secondary_tertiary", "line-color", "#fbd9cb"],
  ["road_minor", "line-color", "#ffffff"],
  ["road_motorway_casing", "line-color", "#c8664a"],
  ["road_trunk_primary_casing", "line-color", "#d98a70"],
  ["road_secondary_tertiary_casing", "line-color", "#dfae9c"],
  ["road_minor_casing", "line-color", "#d9bfb5"],
  ["bridge_motorway", "line-color", "#e98e6f"],
  ["bridge_trunk_primary", "line-color", "#f3b39c"],
  ["building", "fill-color", "#e3c7be"],
  ["building-3d", "fill-extrusion-color", "#e6cbc2"],
  ["building-3d", "fill-extrusion-opacity", 0.85],
  // Labels: plum on a cream halo reads clearly over roads and buildings.
  ...(["label_other", "label_village", "label_town", "label_city", "label_city_capital"] as const).flatMap(
    (id): Array<[string, PaintArgs[1], PaintArgs[2]]> => [
      [id, "text-color", PLUM],
      [id, "text-halo-color", HALO],
      [id, "text-halo-width", 1.6],
    ],
  ),
  ...(["highway-name-major", "highway-name-minor"] as const).flatMap(
    (id): Array<[string, PaintArgs[1], PaintArgs[2]]> => [
      [id, "text-color", "#7a4a3c"],
      [id, "text-halo-color", HALO],
      [id, "text-halo-width", 1.4],
    ],
  ),
  ["water_name_point_label", "text-color", "#5e3d53"],
  ["water_name_line_label", "text-color", "#5e3d53"],
];

type LayoutArgs = Parameters<MapLibreMap["setLayoutProperty"]>;

/** Latin-script only (no stacked Arabic line), so neighbourhood names stay short and readable. */
// No raw `name` fallback: it brings back Arabic-only labels (and glyph ranges the tile font lacks).
const LATIN_NAME: ExpressionSpecification = ["coalesce", ["get", "name:latin"], ""];
const size = (z1: number, s1: number, z2: number, s2: number): ExpressionSpecification => [
  "interpolate",
  ["linear"],
  ["zoom"],
  z1,
  s1,
  z2,
  s2,
];

const LAYOUT: Array<[layer: string, prop: LayoutArgs[1], value: LayoutArgs[2]]> = [
  ...[
    "label_other",
    "label_village",
    "label_town",
    "label_city",
    "label_city_capital",
    "highway-name-major",
    "highway-name-minor",
    "water_name_point_label",
    "water_name_line_label",
  ].map((id): [string, LayoutArgs[1], LayoutArgs[2]] => [id, "text-field", LATIN_NAME]),
  // Neighbourhoods and districts: noticeably larger than the style's defaults.
  ["label_other", "text-size", size(10, 11.5, 15, 15)],
  // Upright, normal case: the style's italic caps are hard to read at a glance.
  ["label_other", "text-font", ["Noto Sans Regular"]],
  ["label_other", "text-transform", "none"],
  ["label_other", "text-letter-spacing", 0.02],
  ["label_village", "text-size", size(9, 12, 15, 17)],
  ["label_town", "text-size", size(9, 13, 15, 19)],
  ["label_city", "text-size", size(8, 15, 13, 22)],
  ["highway-name-major", "text-size", size(12, 11, 16, 14)],
];

/** Clutter that competes with the property markers. */
const HIDDEN = /^(poi_|highway-shield|road_shield|road_one_way|aeroway_|highway-name-path|airport|label_state|label_country)/;

function brandStyle(map: MapLibreMap) {
  for (const layer of map.getStyle().layers ?? []) {
    if (HIDDEN.test(layer.id)) map.setLayoutProperty(layer.id, "visibility", "none");
  }
  // A style update can rename a layer or property; skip it and the base style still renders.
  for (const [id, prop, value] of PAINT) {
    if (!map.getLayer(id)) continue;
    try {
      map.setPaintProperty(id, prop, value);
    } catch {}
  }
  for (const [id, prop, value] of LAYOUT) {
    if (!map.getLayer(id)) continue;
    try {
      map.setLayoutProperty(id, prop, value);
    } catch {}
  }
}

interface MarkerSlot {
  property: Property;
  el: HTMLElement;
}

export default function PropertyMap({
  mode,
  results,
  searching,
  area,
  focusIds = [],
  saved,
  onSelectProperty,
  children,
  showControls = true,
  layer,
  onLayerChange,
}: {
  mode: ListingMode;
  /** Pando's current recommendation set: only these markers stay on the map. */
  results: RecommendationResult | null;
  /** Pando is working on a request: markers dim until the new set lands. */
  searching: boolean;
  /** The community the user just asked about; the map flies there while Pando thinks. */
  area: string | null;
  /** Homes Pando is talking about ("the second one"): lifted and ringed on the map. */
  focusIds?: string[];
  saved: Set<string>;
  onSelectProperty: (p: Property, reasons: string[], match?: number) => void;
  /** Atmosphere overlays: painted over the map tiles but beneath the markers. */
  children?: ReactNode;
  /** The layer picker only belongs on screen once the map itself is visible. */
  showControls?: boolean;
  /** Base layer, owned by the conversation so Pando can switch it by voice or chat. */
  layer: MapLayerId;
  onLayerChange: (id: MapLayerId) => void;
}) {
  const reduce = Boolean(useReducedMotion());
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [slots, setSlots] = useState<MarkerSlot[]>([]);
  const [failed, setFailed] = useState(false);
  /** The style's own ground layers, captured after the brand grade so satellite can swap them out. */
  const baseLayersRef = useRef<string[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: MapLibreMap;
    try {
      setWorkerUrl(new URL(WORKER_URL, window.location.origin).href);
      map = new MapLibreMap({
        container,
        style: STYLE_URL,
        center: DUBAI_CENTER,
        zoom: 11,
        ...CAMERA,
        ...ZOOM,
        maxPitch: 65,
        maxBounds: [
          [54.75, 24.75],
          [55.75, 25.45],
        ],
        // Attribution text is kept; the expand/collapse ⓘ button is hidden via CSS.
        attributionControl: { compact: true, customAttribution: "" },
        // On small screens the page scrolls, so a single finger must not be captured by the map.
        cooperativeGestures: window.innerWidth < 1024,
      });
    } catch {
      // No WebGL: the cosy gradient atmosphere behind the map stays visible.
      queueMicrotask(() => setFailed(true));
      return;
    }
    mapRef.current = map;
    const { center, zoom, padding } = frame(map, propertyGeoJSON.features, false);
    map.jumpTo({ center, zoom, padding });

    map.on("style.load", () => {
      brandStyle(map);
      baseLayersRef.current = collectBaseLayers(map);
      map.addSource("properties", { type: "geojson", data: propertyGeoJSON, promoteId: "id" });
      // Soft coral pool of light under every listing; mint once Pando recommends it.
      map.addLayer({
        id: "property-glow",
        type: "circle",
        source: "properties",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 30],
          "circle-color": ["case", ["boolean", ["feature-state", "match"], false], "#b5ffc2", "#ff3319"],
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "hidden"], false],
            0,
            ["boolean", ["feature-state", "match"], false],
            0.45,
            0.12,
          ],
          "circle-opacity-transition": { duration: 500 },
          "circle-blur": 0.9,
          "circle-pitch-alignment": "map",
        },
      });
    });

    const markers = propertyGeoJSON.features.flatMap((f) => {
      const property = getProperty(f.properties.id);
      if (!property) return [];
      const el = document.createElement("div");
      el.className = "pando-marker";
      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat(f.geometry.coordinates as [number, number])
        .addTo(map);
      return [{ marker, slot: { property, el } }];
    });
    setSlots(markers.map((m) => m.slot));

    return () => {
      markers.forEach((m) => m.marker.remove());
      map.remove();
      mapRef.current = null;
      setSlots([]);
    };
  }, []);

  // Base layer switching. Re-applied on style.load too, so a reload keeps the user's choice.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => applyMapLayer(map, layer, baseLayersRef.current);
    if (map.isStyleLoaded()) apply();
    else map.once("style.load", () => queueMicrotask(apply));
  }, [layer]);

  const matches = useMemo(() => {
    const byId = new Map<string, { match: number; reasons: string[] }>();
    for (const r of results?.items ?? []) byId.set(r.property.id, { match: r.match, reasons: r.reasons });
    return byId;
  }, [results]);

  const hasMatches = matches.size > 0;
  const pinState = (id: string): PinState =>
    searching ? "muted" : hasMatches ? (matches.has(id) ? "match" : "hidden") : "default";

  // 1. As soon as Pando understands an area, fly there.
  useEffect(() => {
    const map = mapRef.current;
    if (map && area) flyToArea(map, area, reduce);
  }, [area, reduce]);

  // 2. Matches appear and everything else disappears, including the glow beneath them.
  const stateKey = `${searching}:${[...matches.keys()].join(",")}`;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      for (const f of propertyGeoJSON.features) {
        const state = pinState(f.properties.id);
        map.setFeatureState(
          { source: "properties", id: f.properties.id },
          { match: state === "match", hidden: state === "hidden" },
        );
      }
    };
    if (map.getSource("properties")) apply();
    else map.once("style.load", () => queueMicrotask(apply));
    // stateKey captures searching + the matched ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey]);

  // 3. Frame the matches, or fly back to the Dubai overview when the search is cleared.
  const framed = useRef(false);
  const resultKey = results ? `${results.id ?? 0}:${[...matches.keys()].join(",")}` : "";
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const picked = propertyGeoJSON.features.filter((f) => matches.has(f.properties.id));
    // Skip the very first run: the map already opens on the overview.
    if (!picked.length && !framed.current) return;
    framed.current = true;
    const { center, zoom, bearing, pitch, padding } = picked.length
      ? frame(map, picked, true)
      : frame(map, propertyGeoJSON.features, false);
    map.flyTo({ center, zoom, bearing, pitch, padding, duration: reduce ? 0 : 1800, curve: 1.3, essential: true });
    // resultKey captures every change to the recommendation set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey, reduce]);

  return (
    <div aria-label="Map of Dubai properties" role="region" className="pando-map absolute inset-0 z-0">
      <div className={`absolute inset-0 ${failed ? "hidden" : ""}`}>
        <div ref={containerRef} className="size-full" />
      </div>
      {children}
      {/* No full-screen scrim over imagery — satellite tiles must render at natural contrast. */}
      {showControls && !failed && <MapLayerControl layer={layer} onChange={onLayerChange} />}
      {slots.map(({ property, el }) => {
        const m = matches.get(property.id);
        const state = pinState(property.id);
        const rank = results?.items.findIndex((r) => r.property.id === property.id) ?? -1;
        return createPortal(
          <PropertyPin
            property={property}
            mode={mode}
            state={state}
            match={m?.match}
            rank={rank >= 0 ? rank + 1 : undefined}
            focused={focusIds.includes(property.id)}
            saved={saved.has(property.id)}
            onOpen={() => onSelectProperty(property, m?.reasons ?? defaultReasons(property), m?.match)}
          />,
          el,
          property.id,
        );
      })}
    </div>
  );
}
