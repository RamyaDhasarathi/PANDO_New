import type { SearchPreferences } from "@/lib/intentParser";

export type QuestionId = "type" | "budget" | "area" | "lifestyle";

export interface QuestionOption {
  label: string;
  /** Short acknowledgement Pando uses once this option is chosen. */
  ack: string;
  prefs: SearchPreferences;
}

export interface Question {
  id: QuestionId;
  label: string;
  /** Two-line label used on the floating card. */
  card: string;
  /** Compact label for follow-up chips in the speech bubble. */
  short: string;
  /** What Pando asks in the speech bubble when this card is tapped. */
  ask: string;
  options: QuestionOption[];
}

export const QUESTIONS: Question[] = [
  {
    id: "type",
    label: "Apartments or Villas?",
    card: "Apartments\nor Villas?",
    short: "Apartment or villa?",
    ask: "Great. Are you looking for an apartment or villa?",
    options: [
      { label: "Apartment", ack: "an apartment", prefs: { propertyType: "apartment" } },
      { label: "Villa", ack: "a villa", prefs: { propertyType: "villa" } },
    ],
  },
  {
    id: "budget",
    label: "What's your budget range?",
    card: "What's your\nbudget range?",
    short: "Set a budget",
    ask: "What budget feels comfortable for you?",
    options: [
      { label: "Under AED 2M", ack: "under AED 2M", prefs: { budget: 2_000_000 } },
      { label: "AED 2–5M", ack: "AED 2–5M", prefs: { budgetMin: 2_000_000, budget: 5_000_000 } },
      { label: "AED 5M+", ack: "AED 5M and up", prefs: { budgetMin: 5_000_000 } },
    ],
  },
  {
    id: "area",
    label: "Which area interests you?",
    card: "Which area\ninterests you?",
    short: "Pick an area",
    ask: "Lovely. Which part of Dubai do you picture yourself in?",
    options: [
      { label: "Downtown", ack: "around Downtown", prefs: { location: "Downtown Dubai" } },
      { label: "Dubai Marina", ack: "in Dubai Marina", prefs: { location: "Dubai Marina" } },
      { label: "Dubai Hills", ack: "in Dubai Hills", prefs: { location: "Dubai Hills Estate" } },
      { label: "The Palm", ack: "on the Palm", prefs: { location: "Palm Jumeirah" } },
    ],
  },
  {
    id: "lifestyle",
    label: "Any specific lifestyle needs?",
    card: "Any specific\nlifestyle needs?",
    short: "Lifestyle needs",
    ask: "What matters most to your everyday life?",
    options: [
      { label: "Family friendly", ack: "family friendly", prefs: { lifestyle: ["family"] } },
      { label: "Near the beach", ack: "near the beach", prefs: { lifestyle: ["beach"] } },
      { label: "Modern", ack: "modern", prefs: { lifestyle: ["modern"] } },
      { label: "Quiet & green", ack: "quiet and green", prefs: { lifestyle: ["quiet"] } },
    ],
  },
];

/** What the simulated microphone "hears". */
export const VOICE_SAMPLES = [
  "I want a modern 2 bedroom apartment near Downtown under AED 2M",
  "A family friendly villa in Dubai Hills under AED 6M",
  "Something near the beach with 2 bedrooms, around AED 3M",
];
