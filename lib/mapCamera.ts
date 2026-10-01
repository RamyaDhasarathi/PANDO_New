/**
 * Camera framing for a rotated, pitched map. MapLibre's fitBounds fits the lat/lng
 * box, which at a steep bearing is far larger than the spread of the points
 * themselves; this fits the points directly in the rotated screen frame.
 */

type LngLat = [lng: number, lat: number];

export interface Padding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Camera {
  center: LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
  padding: Padding;
}

/** MapLibre renders 512px tiles: the world is 512·2^zoom pixels wide. */
const TILE = 512;

const toMercator = ([lng, lat]: LngLat) => [
  (lng + 180) / 360,
  (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2,
];

const fromMercator = (x: number, y: number): LngLat => [
  x * 360 - 180,
  (360 / Math.PI) * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - 90,
];

/** Rotates a mercator vector into screen orientation for the given bearing (y down). */
function rotate(x: number, y: number, bearing: number) {
  const b = (bearing * Math.PI) / 180;
  return [x * Math.cos(b) + y * Math.sin(b), -x * Math.sin(b) + y * Math.cos(b)];
}

export function fitPoints(
  points: LngLat[],
  size: { width: number; height: number },
  view: { bearing: number; pitch: number; padding: Padding; maxZoom: number; minZoom: number },
): Camera & { project: (p: LngLat) => [x: number, y: number] } {
  const { bearing, pitch, padding } = view;
  const rotated = points.map((p) => {
    const [mx, my] = toMercator(p);
    return rotate(mx, my, bearing);
  });
  const xs = rotated.map((r) => r[0]);
  const ys = rotated.map((r) => r[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];

  const availW = Math.max(1, size.width - padding.left - padding.right);
  const availH = Math.max(1, size.height - padding.top - padding.bottom);
  // Tilting foreshortens ground distance along the view direction.
  const tilt = Math.cos((pitch * Math.PI) / 180);
  const scale = Math.min(availW / Math.max(maxX - minX, 1e-9), availH / Math.max((maxY - minY) * tilt, 1e-9));
  const zoom = Math.min(view.maxZoom, Math.max(view.minZoom, Math.log2(scale / TILE)));

  const [cx, cy] = rotate((minX + maxX) / 2, (minY + maxY) / 2, -bearing);
  const worldPx = TILE * 2 ** zoom;
  const originX = padding.left + availW / 2;
  const originY = padding.top + availH / 2;
  const [rcx, rcy] = [(minX + maxX) / 2, (minY + maxY) / 2];

  return {
    center: fromMercator(cx, cy),
    zoom,
    bearing,
    pitch,
    padding,
    /** Approximate screen position (ignores perspective), used to keep points clear of Pando. */
    project: (p) => {
      const [mx, my] = toMercator(p);
      const [rx, ry] = rotate(mx, my, bearing);
      return [originX + (rx - rcx) * worldPx, originY + (ry - rcy) * worldPx * tilt];
    },
  };
}
