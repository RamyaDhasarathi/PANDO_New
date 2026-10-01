export type PropertyType = "Apartment" | "Villa";

export type Lifestyle =
  | "beach"
  | "family"
  | "modern"
  | "spacious"
  | "quiet"
  | "luxury"
  | "view"
  | "pool"
  | "value"
  | "offplan";

export interface Property {
  id: string;
  name: string;
  location: string;
  /** Communities within a short drive, used for "near X" matching. */
  nearby: string[];
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  /** Sale price in AED. */
  price: number;
  /** Annual rent in AED. */
  rentPerYear: number;
  areaSqft: number;
  image: string;
  tags: string[];
  lifestyle: Lifestyle[];
  offPlan: boolean;
  handover?: string;
  amenities: string[];
  description: string;
}

export const COMMUNITIES = [
  "Downtown Dubai",
  "Dubai Hills Estate",
  "Dubai Marina",
  "Palm Jumeirah",
  "JBR",
  "Business Bay",
  "Arabian Ranches",
  "Dubai Creek Harbour",
  "Jumeirah Village Circle",
  "Emaar Beachfront",
] as const;

export const properties: Property[] = [
  {
    id: "burj-vista-2br",
    name: "Burj Vista Residences",
    location: "Downtown Dubai",
    nearby: ["Business Bay", "Dubai Creek Harbour"],
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    price: 2_400_000,
    rentPerYear: 185_000,
    areaSqft: 1_340,
    image: "/properties/downtown-interior.svg",
    tags: ["Burj Khalifa view", "Modern interior", "Walk to Dubai Mall"],
    lifestyle: ["modern", "view", "luxury"],
    offPlan: false,
    amenities: ["Infinity pool", "Fitness studio", "24/7 concierge", "Covered parking", "Dubai Mall access"],
    description:
      "A bright corner apartment with floor-to-ceiling glass framing the Burj Khalifa. Open-plan living, a chef's kitchen and a wraparound balcony a short stroll from the Boulevard.",
  },
  {
    id: "parkway-villa-4br",
    name: "Parkway Vistas Villa",
    location: "Dubai Hills Estate",
    nearby: ["Downtown Dubai", "Arabian Ranches"],
    type: "Villa",
    bedrooms: 4,
    bathrooms: 5,
    price: 5_800_000,
    rentPerYear: 420_000,
    areaSqft: 4_850,
    image: "/properties/hills-villa.svg",
    tags: ["Private pool", "Family friendly", "Golf course views"],
    lifestyle: ["family", "pool", "spacious", "modern", "quiet"],
    offPlan: false,
    amenities: ["Private pool", "Landscaped garden", "Maid's room", "2-car garage", "Golf club access"],
    description:
      "A contemporary family villa overlooking the championship golf course, with a landscaped garden, private pool and generous living spaces for everyday life and entertaining.",
  },
  {
    id: "marina-gate-1br",
    name: "Marina Gate Apartment",
    location: "Dubai Marina",
    nearby: ["JBR", "Emaar Beachfront"],
    type: "Apartment",
    bedrooms: 1,
    bathrooms: 2,
    price: 1_650_000,
    rentPerYear: 120_000,
    areaSqft: 880,
    image: "/properties/marina.svg",
    tags: ["Marina views", "Near the beach", "Modern tower"],
    lifestyle: ["beach", "modern", "view"],
    offPlan: false,
    amenities: ["Infinity pool", "Gym", "Marina promenade", "Concierge", "Covered parking"],
    description:
      "A calm one-bedroom above the marina promenade with sunset water views, resident gym and infinity pool, minutes from the beach at JBR.",
  },
  {
    id: "palm-shoreline-5br",
    name: "Palm Shoreline Villa",
    location: "Palm Jumeirah",
    nearby: ["Dubai Marina", "JBR"],
    type: "Villa",
    bedrooms: 5,
    bathrooms: 6,
    price: 12_500_000,
    rentPerYear: 950_000,
    areaSqft: 7_200,
    image: "/properties/palm-villa.svg",
    tags: ["Private beach", "Infinity pool", "Skyline views"],
    lifestyle: ["beach", "luxury", "pool", "spacious", "view"],
    offPlan: false,
    amenities: ["Private beach", "Infinity pool", "Home cinema", "Staff quarters", "Boat mooring"],
    description:
      "A signature frond villa with its own stretch of beach, an infinity pool facing the skyline and a double-height living room that opens straight onto the sand.",
  },
  {
    id: "sadaf-jbr-3br",
    name: "Sadaf Beach Residence",
    location: "JBR",
    nearby: ["Dubai Marina", "Emaar Beachfront"],
    type: "Apartment",
    bedrooms: 3,
    bathrooms: 3,
    price: 3_200_000,
    rentPerYear: 240_000,
    areaSqft: 2_050,
    image: "/properties/jbr-beach.svg",
    tags: ["Steps to the beach", "Family friendly", "Spacious layout"],
    lifestyle: ["beach", "family", "spacious"],
    offPlan: false,
    amenities: ["Direct beach access", "Kids' pool", "Gym", "The Walk retail", "Covered parking"],
    description:
      "A spacious three-bedroom right on The Walk with direct beach access, a large family kitchen and a sea-facing terrace for long evenings.",
  },
  {
    id: "canal-loft-2br",
    name: "Canal View Loft",
    location: "Business Bay",
    nearby: ["Downtown Dubai"],
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    price: 1_850_000,
    rentPerYear: 140_000,
    areaSqft: 1_220,
    image: "/properties/business-bay.svg",
    tags: ["Modern interior", "Canal views", "Near Downtown"],
    lifestyle: ["modern", "view", "value"],
    offPlan: false,
    amenities: ["Smart-home controls", "Rooftop pool", "Gym", "Canal boardwalk", "Covered parking"],
    description:
      "A crisp, design-led two-bedroom on the Dubai Water Canal with Burj views, smart-home controls and a five-minute drive to Downtown.",
  },
  {
    id: "saheel-ranches-3br",
    name: "Saheel Family Villa",
    location: "Arabian Ranches",
    nearby: ["Dubai Hills Estate"],
    type: "Villa",
    bedrooms: 3,
    bathrooms: 4,
    price: 3_900_000,
    rentPerYear: 260_000,
    areaSqft: 3_300,
    image: "/properties/ranches-villa.svg",
    tags: ["Family friendly", "Quiet community", "Green parks"],
    lifestyle: ["family", "quiet", "spacious"],
    offPlan: false,
    amenities: ["Community pool", "Parks & play areas", "Nearby schools", "Private garden", "2 parking spaces"],
    description:
      "A warm, light-filled villa on a quiet close near parks, schools and the community pool — made for families who want space to breathe.",
  },
  {
    id: "creek-rise-2br",
    name: "Creek Rise Tower",
    location: "Dubai Creek Harbour",
    nearby: ["Downtown Dubai", "Business Bay"],
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    price: 1_950_000,
    rentPerYear: 135_000,
    areaSqft: 1_180,
    image: "/properties/creek-tower.svg",
    tags: ["Off plan", "Waterfront", "Modern design"],
    lifestyle: ["offplan", "modern", "view", "value"],
    offPlan: true,
    handover: "Q4 2027",
    amenities: ["Flexible payment plan", "Creek promenade", "Pool deck", "Gym", "Retail podium"],
    description:
      "An off-plan waterfront residence with a flexible payment plan, creek promenade on your doorstep and skyline views back toward Downtown.",
  },
  {
    id: "circle-park-3br",
    name: "Circle Park Residence",
    location: "Jumeirah Village Circle",
    nearby: ["Dubai Hills Estate"],
    type: "Apartment",
    bedrooms: 3,
    bathrooms: 3,
    price: 1_450_000,
    rentPerYear: 110_000,
    areaSqft: 1_720,
    image: "/properties/jvc-park.svg",
    tags: ["Great value", "Family friendly", "Park views"],
    lifestyle: ["family", "value", "spacious", "quiet"],
    offPlan: false,
    amenities: ["Park views", "Kids' play area", "Community pool", "Gym", "Covered parking"],
    description:
      "A generous three-bedroom facing a landscaped park, with kids' play areas, a community pool and excellent value for growing families.",
  },
  {
    id: "beachfront-sky-2br",
    name: "Beachfront Sky Suite",
    location: "Emaar Beachfront",
    nearby: ["Dubai Marina", "JBR", "Palm Jumeirah"],
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 3,
    price: 2_900_000,
    rentPerYear: 210_000,
    areaSqft: 1_410,
    image: "/properties/beachfront-suite.svg",
    tags: ["Near the beach", "Off plan", "Modern apartment"],
    lifestyle: ["beach", "modern", "offplan", "view", "luxury"],
    offPlan: true,
    handover: "Q2 2027",
    amenities: ["Private island beach", "Resort pool", "Gym", "Concierge", "Marina access"],
    description:
      "A sleek off-plan suite on a private island beach between the Palm and the Marina, with resort amenities and uninterrupted sea views.",
  },
  {
    id: "marina-heights-2br",
    name: "Marina Heights Residence",
    location: "Dubai Marina",
    nearby: ["JBR", "Emaar Beachfront", "Palm Jumeirah"],
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    price: 1_950_000,
    rentPerYear: 150_000,
    areaSqft: 1_250,
    image: "/properties/marina.svg",
    tags: ["Marina views", "Walk to the tram", "Modern tower"],
    lifestyle: ["modern", "view", "beach"],
    offPlan: false,
    amenities: ["Infinity pool", "Gym", "Marina walk", "Concierge", "Covered parking"],
    description:
      "A bright two-bedroom high above the marina with a long balcony, an open kitchen and the tram and beach a short walk away.",
  },
  {
    id: "marina-quays-2br",
    name: "Marina Quays Apartment",
    location: "Dubai Marina",
    nearby: ["JBR", "Emaar Beachfront"],
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    price: 1_780_000,
    rentPerYear: 138_000,
    areaSqft: 1_180,
    image: "/properties/jbr-beach.svg",
    tags: ["Waterfront promenade", "Family friendly", "Great value"],
    lifestyle: ["family", "value", "beach"],
    offPlan: false,
    amenities: ["Kids' pool", "Gym", "Waterfront promenade", "Retail podium", "Covered parking"],
    description:
      "A calm, family-sized two-bedroom on the quieter side of the marina, with a waterfront promenade and good value for the area.",
  },
  {
    id: "boulevard-point-1br",
    name: "Boulevard Point",
    location: "Downtown Dubai",
    nearby: ["Business Bay"],
    type: "Apartment",
    bedrooms: 1,
    bathrooms: 2,
    price: 1_600_000,
    rentPerYear: 125_000,
    areaSqft: 910,
    image: "/properties/downtown-interior.svg",
    tags: ["Fountain views", "Walk to Dubai Mall", "Modern interior"],
    lifestyle: ["modern", "view", "luxury"],
    offPlan: false,
    amenities: ["Pool deck", "Gym", "Direct mall access", "Concierge", "Valet parking"],
    description:
      "A polished one-bedroom on the Boulevard with views over the fountain and a covered walk into Dubai Mall.",
  },
  {
    id: "park-heights-2br",
    name: "Park Heights Apartment",
    location: "Dubai Hills Estate",
    nearby: ["Downtown Dubai", "Arabian Ranches"],
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    price: 1_700_000,
    rentPerYear: 130_000,
    areaSqft: 1_150,
    image: "/properties/jvc-park.svg",
    tags: ["Park views", "Family friendly", "Quiet community"],
    lifestyle: ["family", "quiet", "value", "modern"],
    offPlan: false,
    amenities: ["Central park access", "Community pool", "Gym", "Nearby schools", "Covered parking"],
    description:
      "A green, peaceful two-bedroom overlooking Dubai Hills Park, with schools and the mall a few minutes away.",
  },
  {
    id: "palm-tower-2br",
    name: "Palm Tower Residence",
    location: "Palm Jumeirah",
    nearby: ["Dubai Marina", "JBR"],
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 3,
    price: 3_400_000,
    rentPerYear: 250_000,
    areaSqft: 1_560,
    image: "/properties/beachfront-suite.svg",
    tags: ["Sea views", "Beach club access", "Luxury finishes"],
    lifestyle: ["beach", "luxury", "view", "pool"],
    offPlan: false,
    amenities: ["Beach club", "Infinity pool", "Spa", "Concierge", "Valet parking"],
    description:
      "A high-floor two-bedroom on the trunk of the Palm with sea views on both sides and beach-club access downstairs.",
  },
  {
    id: "bay-square-studio",
    name: "Bay Square Studio",
    location: "Business Bay",
    nearby: ["Downtown Dubai"],
    type: "Apartment",
    bedrooms: 0,
    bathrooms: 1,
    price: 850_000,
    rentPerYear: 72_000,
    areaSqft: 520,
    image: "/properties/business-bay.svg",
    tags: ["Great value", "Near Downtown", "Modern studio"],
    lifestyle: ["modern", "value"],
    offPlan: false,
    amenities: ["Pool", "Gym", "Cafés downstairs", "Metro nearby", "Covered parking"],
    description:
      "A smart, efficient studio in a walkable Business Bay square, ideal as a first home or a well-located investment.",
  },
  {
    id: "jvc-townhouse-3br",
    name: "Circle Garden Townhouse",
    location: "Jumeirah Village Circle",
    nearby: ["Dubai Hills Estate"],
    type: "Villa",
    bedrooms: 3,
    bathrooms: 4,
    price: 2_300_000,
    rentPerYear: 160_000,
    areaSqft: 2_400,
    image: "/properties/ranches-villa.svg",
    tags: ["Private garden", "Family friendly", "Great value"],
    lifestyle: ["family", "value", "spacious"],
    offPlan: false,
    amenities: ["Private garden", "Community pool", "Play areas", "Maid's room", "2 parking spaces"],
    description:
      "A three-bedroom townhouse with its own garden on a quiet JVC street — villa living at an apartment-like price.",
  },
];

/** Approximate centre of each community, [lng, lat], for flying the map there. */
export const AREA_CENTERS: Record<(typeof COMMUNITIES)[number], [number, number]> = {
  "Downtown Dubai": [55.2745, 25.1955],
  "Dubai Hills Estate": [55.2455, 25.1105],
  "Dubai Marina": [55.1405, 25.0815],
  "Palm Jumeirah": [55.1335, 25.1165],
  JBR: [55.1335, 25.0785],
  "Business Bay": [55.2665, 25.1855],
  "Arabian Ranches": [55.2685, 25.0525],
  "Dubai Creek Harbour": [55.3455, 25.2015],
  "Jumeirah Village Circle": [55.2075, 25.0585],
  "Emaar Beachfront": [55.1435, 25.0975],
};

/** The two homes shown around Pando before the user starts a conversation. */
export const SHOWCASE_IDS = ["burj-vista-2br", "parkway-villa-4br"] as const;

export function getProperty(id: string): Property | undefined {
  return properties.find((p) => p.id === id);
}
