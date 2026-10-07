/**
 * How far the 3D Pando's canvas extends past the artwork's box, per side, as a fraction
 * of that box. The relief turns up to ~27° and bobs, so it needs room beyond the flat
 * silhouette — mostly sideways, where the arms swing toward the camera. The camera is
 * framed from these numbers so the resting relief lands exactly on the artwork's box
 * (and its hit area). Kept apart from the 3D module so the page can size the canvas
 * without loading three.js.
 */
export const OVERHANG = { x: 0.26, y: 0.12 };
