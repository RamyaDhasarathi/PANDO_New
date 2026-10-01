import type { Feature, FeatureCollection, Point } from "geojson";
import { properties } from "./properties";

/** Dubai, framed so the Marina and Creek Harbour both sit inside the first view. */
export const DUBAI_CENTER: [lng: number, lat: number] = [55.225, 25.135];

/** Approximate locations of the mock listings, [lng, lat]. */
const COORDINATES: Record<string, [number, number]> = {
  "burj-vista-2br": [55.2744, 25.1945],
  "parkway-villa-4br": [55.2505, 25.1105],
  "marina-gate-1br": [55.1405, 25.0875],
  "palm-shoreline-5br": [55.1275, 25.1195],
  "sadaf-jbr-3br": [55.1335, 25.0785],
  "canal-loft-2br": [55.2605, 25.1845],
  "saheel-ranches-3br": [55.2685, 25.0505],
  "creek-rise-2br": [55.3465, 25.2025],
  "circle-park-3br": [55.2095, 25.0605],
  "beachfront-sky-2br": [55.1435, 25.0985],
  "marina-heights-2br": [55.1372, 25.0848],
  "marina-quays-2br": [55.1452, 25.0772],
  "boulevard-point-1br": [55.2772, 25.1985],
  "park-heights-2br": [55.2408, 25.1168],
  "palm-tower-2br": [55.1392, 25.1128],
  "bay-square-studio": [55.2808, 25.1878],
  "jvc-townhouse-3br": [55.2038, 25.0558],
};

export interface PropertyFeatureProps {
  id: string;
  name: string;
  location: string;
  type: string;
  price: number;
  rentPerYear: number;
  offPlan: boolean;
}

export type PropertyFeature = Feature<Point, PropertyFeatureProps>;

export const propertyGeoJSON: FeatureCollection<Point, PropertyFeatureProps> = {
  type: "FeatureCollection",
  features: properties
    .filter((p) => COORDINATES[p.id])
    .map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: COORDINATES[p.id] },
      properties: {
        id: p.id,
        name: p.name,
        location: p.location,
        type: p.type,
        price: p.price,
        rentPerYear: p.rentPerYear,
        offPlan: p.offPlan,
      },
    })),
};
