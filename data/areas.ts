import type { COMMUNITIES, Lifestyle } from "./properties";

export type AreaName = (typeof COMMUNITIES)[number];

/**
 * Pando's local area knowledge. Written to be spoken: short, plain and honest about
 * trade-offs. Phrase shapes matter because the advisor composes them into sentences:
 * - `vibe` completes "Marina is …"
 * - `strengths` complete "… with …" / "Pick Marina for …"
 * - `tradeoffs` are whole clauses: "The trade-off: …"
 */
export interface AreaAdvice {
  area: AreaName;
  /** How Pando says it in conversation. */
  short: string;
  vibe: string;
  /** The spoken overview: character, who it suits, the main trade-off. */
  brief: string;
  lifestyles: Lifestyle[];
  strengths: string[];
  tradeoffs: string[];
  /** Rough price positioning. */
  price: string;
  /** Investment and rental notes. */
  investment: string;
  /** The natural area to compare it with. */
  compareWith: AreaName;
}

export const AREAS: Record<AreaName, AreaAdvice> = {
  "Downtown Dubai": {
    area: "Downtown Dubai",
    short: "Downtown",
    vibe: "iconic, busy and walkable",
    brief:
      "Downtown is Dubai at its most iconic, with the Burj Khalifa and Dubai Mall on your doorstep. It's buzzy and walkable, but you pay a premium and give up space.",
    lifestyles: ["modern", "view", "luxury"],
    strengths: ["Dubai Mall and the Boulevard on your doorstep", "skyline views", "strong holiday-let demand"],
    tradeoffs: ["it's busy and touristy", "homes are smaller for the price", "there's little green space"],
    price: "Downtown is premium: among the highest prices per square foot in the city.",
    investment:
      "Downtown rents well year-round, especially as a holiday let. Yields are solid, but entry prices are high.",
    compareWith: "Dubai Hills Estate",
  },
  "Dubai Hills Estate": {
    area: "Dubai Hills Estate",
    short: "Dubai Hills",
    vibe: "green, family-oriented and newer",
    brief:
      "Dubai Hills is more residential and family-oriented than Marina. You get newer communities and more open space, but you're farther from the waterfront.",
    lifestyles: ["family", "quiet", "spacious", "modern", "pool"],
    strengths: ["a central park and golf course", "good schools nearby", "newer, well-planned streets"],
    tradeoffs: ["it's farther from the beach", "you'll drive most places", "parts are still being built"],
    price: "Dubai Hills is upper-mid to premium: villas are pricey, apartments are fair value.",
    investment:
      "Dubai Hills has steady demand from families, and values have climbed as the community matures.",
    compareWith: "Dubai Marina",
  },
  "Dubai Marina": {
    area: "Dubai Marina",
    short: "Marina",
    vibe: "lively, walkable and on the water",
    brief:
      "Dubai Marina is lively and walkable, with a waterfront promenade and the beach close by. Great for a social lifestyle, but it's dense and traffic can be heavy.",
    lifestyles: ["beach", "view", "modern"],
    strengths: ["the promenade and beach on your doorstep", "tram and metro links", "plenty of cafés and restaurants"],
    tradeoffs: ["it's dense, with lots of towers", "traffic is heavy at peak times", "some buildings are older"],
    price: "Marina is mid to upper-mid, with a wide range from older towers to new launches.",
    investment:
      "Marina is one of the easiest places to rent out: apartments let quickly to young professionals.",
    compareWith: "Dubai Hills Estate",
  },
  "Palm Jumeirah": {
    area: "Palm Jumeirah",
    short: "the Palm",
    vibe: "exclusive, beachy and calm",
    brief:
      "The Palm is Dubai's trophy address: private beaches, sea views and resort living. It's calm and exclusive, but expensive, and there's one road in and out.",
    lifestyles: ["beach", "luxury", "view", "pool", "spacious"],
    strengths: ["private beaches and sea views", "resort-style living", "trophy-home prestige"],
    tradeoffs: ["prices are very high", "there's one road in and out", "everyday shops are limited"],
    price: "The Palm is top tier, home to the city's most expensive villas.",
    investment:
      "The Palm is about capital growth: prime villas hold value well, though rental yields are lower.",
    compareWith: "Dubai Marina",
  },
  JBR: {
    area: "JBR",
    short: "JBR",
    vibe: "beachfront, sunny and social",
    brief:
      "JBR puts you right on the beach, with The Walk's cafés downstairs. It's fun and sunny, but it gets busy with visitors, especially at weekends.",
    lifestyles: ["beach", "family", "spacious"],
    strengths: ["the beach right outside", "The Walk's cafés and shops", "roomy, older layouts"],
    tradeoffs: ["weekends get crowded", "the towers are older", "parking can be tight"],
    price: "JBR is upper-mid: you pay a beachfront premium, but layouts are generous.",
    investment: "JBR is a holiday-let favourite, with high occupancy thanks to the beach.",
    compareWith: "Dubai Marina",
  },
  "Business Bay": {
    area: "Business Bay",
    short: "Business Bay",
    vibe: "modern, central and good value",
    brief:
      "Business Bay is Downtown's younger neighbour, with canal views and new towers minutes from the Burj. Good value for city living, though parts still feel like a building site.",
    lifestyles: ["modern", "view", "value"],
    strengths: ["canal and skyline views", "a five-minute hop to Downtown", "newer towers for less"],
    tradeoffs: ["there's still a lot of construction", "the roads are busy", "it's less geared to families"],
    price: "Business Bay is mid-range, cheaper than Downtown for similar views.",
    investment:
      "Business Bay is popular with investors: lower entry than Downtown and strong demand from professionals.",
    compareWith: "Downtown Dubai",
  },
  "Arabian Ranches": {
    area: "Arabian Ranches",
    short: "Arabian Ranches",
    vibe: "quiet, suburban and spacious",
    brief:
      "Arabian Ranches is classic suburban villa living, with quiet streets, parks and schools. Ideal if you want space, but it's a drive to the city and the beach.",
    lifestyles: ["family", "quiet", "spacious", "pool"],
    strengths: ["quiet streets and parks", "villas with gardens", "schools inside the community"],
    tradeoffs: ["you need a car for everything", "it's far from the coast", "early phases are showing their age"],
    price: "Arabian Ranches is mid to upper-mid for villas, with good space for the money.",
    investment:
      "The Ranches has low vacancy and long-term family tenants: steady rather than spectacular growth.",
    compareWith: "Dubai Hills Estate",
  },
  "Dubai Creek Harbour": {
    area: "Dubai Creek Harbour",
    short: "Creek Harbour",
    vibe: "new, waterfront and still growing",
    brief:
      "Creek Harbour is a new waterfront district with skyline views back to Downtown. Great for off-plan buyers, but it's still being built and amenities are catching up.",
    lifestyles: ["offplan", "modern", "view", "value"],
    strengths: ["waterfront skyline views", "flexible payment plans", "brand-new buildings"],
    tradeoffs: ["it's still under construction", "shops and schools are catching up", "it's far from the beach"],
    price: "Creek Harbour is mid-range, below Downtown, with flexible payment plans.",
    investment:
      "Creek Harbour is an off-plan play: payment plans spread the cost, and returns depend on the area maturing.",
    compareWith: "Downtown Dubai",
  },
  "Jumeirah Village Circle": {
    area: "Jumeirah Village Circle",
    short: "JVC",
    vibe: "affordable, leafy and inland",
    brief:
      "JVC is Dubai's value pick: leafy, family-friendly and affordable. You get more space for your money, but it's inland and the roads can get congested.",
    lifestyles: ["value", "family", "quiet", "spacious"],
    strengths: ["more space for your money", "parks and play areas", "a friendly, residential feel"],
    tradeoffs: ["it's inland", "peak-hour traffic is slow", "build quality varies"],
    price: "JVC is entry to mid-level, one of the most affordable established areas.",
    investment:
      "JVC has some of the best rental yields in Dubai thanks to low entry prices, so it's a favourite with first-time investors.",
    compareWith: "Dubai Hills Estate",
  },
  "Emaar Beachfront": {
    area: "Emaar Beachfront",
    short: "Emaar Beachfront",
    vibe: "sleek, new and resort-like",
    brief:
      "Emaar Beachfront is a private island beach between the Palm and the Marina: sleek, new and resort-like. The sea views are fantastic, though much of it is still off-plan.",
    lifestyles: ["beach", "modern", "offplan", "luxury", "view"],
    strengths: ["a private island beach", "uninterrupted sea views", "resort amenities"],
    tradeoffs: ["much of it is still off-plan", "layouts are compact", "service charges are high"],
    price: "Emaar Beachfront is upper-mid to premium: you're paying for the private beach.",
    investment:
      "Emaar Beachfront has strong holiday-let potential, and off-plan payment plans spread the cost.",
    compareWith: "Dubai Marina",
  },
};
