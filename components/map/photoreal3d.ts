/**
 * Google Photorealistic 3D Tiles, drawn over the MapLibre map by deck.gl.
 *
 * MapLibre has no OGC 3D Tiles renderer, so deck.gl's Tile3DLayer rides along as a
 * MapboxOverlay control sharing the map's camera. Everything here loads on demand: the
 * modules are dynamically imported and the tileset is only requested the first time
 * someone actually picks the 3D view, because Google bills per root tileset request.
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import type { Tile3D, Tileset3D } from "@loaders.gl/tiles";

const TILESET_URL = "https://tile.googleapis.com/v1/3dtiles/root.json";

/** Browser key, restricted to the Map Tiles API. Absent in dev/preview → no 3D option. */
export const PHOTOREAL_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** The 3D layer is only offered when there's a key to fetch it with. */
export const canShowPhotoreal = () => PHOTOREAL_KEY.trim().length > 0;

export type PhotorealHandle = {
  setVisible(visible: boolean): void;
  destroy(): void;
};

/**
 * Google requires the per-tile copyright of whatever is on screen to be shown, alongside
 * its own attribution. The tileset reports it per traversal, so it changes as you fly.
 */
export type CreditsListener = (credits: string) => void;

export async function attachPhotoreal(
  map: MapLibreMap,
  onCredits: CreditsListener,
): Promise<PhotorealHandle | null> {
  if (!canShowPhotoreal()) return null;

  // Dynamic: deck.gl and the 3D Tiles loader are a large bundle no landing page should pay for.
  const [{ MapboxOverlay }, { Tile3DLayer }, { Tiles3DLoader }] = await Promise.all([
    import("@deck.gl/mapbox"),
    import("@deck.gl/geo-layers"),
    import("@loaders.gl/3d-tiles"),
  ]);

  let visible = false;
  let destroyed = false;
  let credits = "";

  const publishCredits = (next: string) => {
    if (next === credits) return;
    credits = next;
    onCredits(next);
  };

  const layer = () =>
    new Tile3DLayer({
      id: "pando-photoreal",
      data: TILESET_URL,
      loader: Tiles3DLoader,
      loadOptions: {
        fetch: { headers: { "X-GOOG-API-KEY": PHOTOREAL_KEY } },
      },
      visible,
      // Lower means fewer, coarser tiles: the detail view is a look around, not a survey.
      maximumScreenSpaceError: 16,
      onTilesetLoad: (tileset: Tileset3D) => {
        tileset.options.onTraversalComplete = (tiles: Tile3D[]) => {
          const seen = new Set<string>();
          for (const tile of tiles) {
            const copyright = (tile.content as { gltf?: { asset?: { copyright?: string } } } | undefined)
              ?.gltf?.asset?.copyright;
            if (!copyright) continue;
            for (const part of copyright.split(";")) {
              const trimmed = part.trim();
              if (trimmed) seen.add(trimmed);
            }
          }
          publishCredits([...seen].join(" · "));
          return tiles;
        };
      },
      onTileError: (_tile: Tile3D, error: unknown) => {
        console.warn("[photoreal] tile failed", error);
      },
    });

  // deck.gl probes map.getProjection() as it mounts, which throws while the style is still
  // null. Wait it out rather than racing it.
  if (!map.isStyleLoaded()) {
    await new Promise<void>((resolve) => {
      map.once("style.load", () => resolve());
      // A style that is already settled may never fire again; don't hang the 3D view on it.
      window.setTimeout(resolve, 4000);
    });
  }

  // Overlaid rather than interleaved: the photoreal mesh is the ground, so it covers the
  // basemap entirely and we never have to reconcile two depth buffers.
  const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
  try {
    map.addControl(overlay);
  } catch (error) {
    // No WebGL2, or a deck.gl/MapLibre mismatch: the map keeps working without 3D.
    console.warn("[photoreal] overlay unavailable", error);
    return null;
  }

  /** Whether 3D has been switched on at least once in this page session. */
  let activated = false;

  return {
    setVisible(next: boolean) {
      if (destroyed || next === visible) return;
      visible = next;
      if (next) activated = true;
      // Still never used: nothing is mounted, so nothing has been requested.
      if (!activated) return;
      /**
       * Once mounted the layer STAYS mounted, toggling `visible` instead of being removed.
       * Google bills per root tileset request, and deck.gl only re-requests the root when
       * `data` changes — so leaving and re-entering 3D costs nothing. Dropping the layer
       * from the array instead would destroy the tileset and bill again on every re-entry.
       * Hidden layers are never drawn, so they also stop requesting tiles in the meantime.
       */
      overlay.setProps({ layers: [layer()] });
      if (!next) publishCredits("");
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      overlay.setProps({ layers: [] });
      try {
        map.removeControl(overlay);
      } catch {
        /* The map may already be torn down. */
      }
      publishCredits("");
    },
  };
}
