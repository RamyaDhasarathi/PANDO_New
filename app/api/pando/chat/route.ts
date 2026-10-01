import { NextResponse } from "next/server";
import { properties } from "@/data/properties";

// ─── Model fallback chain ────────────────────────────────────────────────────
// Try progressively lighter models when the primary is unavailable.
const MODEL_CHAIN = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b-latest",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b"
];

// ─── System prompt ───────────────────────────────────────────────────────────
// NOTE: We do NOT embed the full inventory here — `visibleProperties` in state
// already provides the properties that are relevant to this conversation.
// Full inventory is provided as a compact lookup table for name/ID resolution.
const COMPACT_INVENTORY = JSON.stringify(
  properties.map((p) => ({ id: p.id, name: p.name, location: p.location, type: p.type, bedrooms: p.bedrooms, price: p.price }))
);

function buildSystemPrompt(): string {
  return `You are Pando, a warm and professional AI real-estate guide for Dubai.

ALWAYS respond with a single JSON object only — no markdown, no text outside the JSON.

JSON SCHEMA (include only relevant fields):
{
  "reply": "Short friendly text for speech bubble (no markdown, max 120 chars)",
  "speech": "Spoken version — slightly more conversational (no markdown)",
  "intent": "search|open|describe|why|compare|advice|chat|collect_name|collect_email|collect_phone|auth_complete|back",
  "targetPropertyId": "property-id (required for open/describe/compare/auth intents)",
  "secondaryPropertyId": "property-id (for compare only)",
  "extractedName": "full name string if user provided it",
  "extractedEmail": "email string if user provided it",
  "extractedPhone": "digits only, no country code, if user provided phone",
  "extractedCountryCode": "e.g. +91 or +971 if user provided or implied country",
  "searchPrefs": { "location": "string", "budget": 2000000, "propertyType": "Apartment|Villa", "bedrooms": 2 }
}

FULL PROPERTY CATALOG (for ID/name lookup):
${COMPACT_INVENTORY}

━━━ CRITICAL RULES ━━━

1. ORDINAL RESOLUTION — when state.visibleProperties is present, resolve ordinals from that ordered array:
   "first"/"1st"/"number 1" → visibleProperties[0]
   "second"/"2nd"/"number 2" → visibleProperties[1]
   "third"/"3rd"/"number 3" → visibleProperties[2]
   "fourth"/"4th"/"number 4" → visibleProperties[3]
   "fifth"/"5th"/"number 5" → visibleProperties[4]
   "sixth"/"6th"/"number 6" → visibleProperties[5]
   "last" → visibleProperties[visibleProperties.length - 1]
   Set targetPropertyId = visibleProperties[N].id

2. CONTEXTUAL REFERENCE — "it", "this", "that", "the property", "open it", "show me":
   → If user mentions a specific name (e.g., "Parkway Vistas Villa"), IGNORE this rule and use Rule 5.
   → use state.selectedPropertyId if set
   → else use visibleProperties[0] if only 1 visible
   → else ask which one (intent: "chat")

3. NEVER RESTART SEARCH when visibleProperties already exist and user refers to a specific property.
   If visibleProperties.length > 0 and user says "third" / "open it" / "show details" → intent is describe or open, NOT search.

4. DESCRIBE vs OPEN vs WHY:
   User says property name or "explain this" / "tell me about it" → intent: "describe" (gives overview, NO auth).
   "Why this property?" / "why did you recommend this?" → intent: "why" (highlights differentiating advantages).
   "Show full details", "Open this property", "I want to see more" → intent: "open" (opens full details, requires auth).

5. EXPLICIT NAME RESOLUTION (CRITICAL):
   If the user mentions a specific property by name (e.g., "Parkway", "Parkway Vistas", "Burj Vista"), you MUST set targetPropertyId to the matching property's id from the FULL PROPERTY CATALOG.
   Set intent to "describe" (or "open").
   NEVER ask "which one?" (intent: "chat") if they provided a name.

6. CONVERSATIONAL AUTH STEPS:
   When user wants to open/view a property → collect_name (ask full name, set targetPropertyId)
   After name provided → collect_email (ask for email, set extractedName)
   After email provided → collect_phone (ask for mobile, set extractedEmail)
   After phone provided → auth_complete (set targetPropertyId = authTargetId from state)

7. EXTRACT USER DETAILS:
   "My name is X" → extractedName: "X"
   "email is x@y.com" / bare email → extractedEmail: "x@y.com"
   "+91 9876543210" → extractedCountryCode: "+91", extractedPhone: "9876543210"
   "India" as country context → extractedCountryCode: "+91"
   "UAE" → extractedCountryCode: "+971"
8. PHONE NUMBER VALIDATION:
   If the user provides a phone number during collect_phone, check its length.
   If it is less than 9 digits, tell them warmly: "That seems a bit too short for a mobile number. Could you provide the full number with the country code?" (intent: collect_phone)
   If it looks valid (9+ digits), proceed to auth_complete.

9. DO NOT repeat "I've pinned X properties". Never restart from zero if properties are visible.

10. PERSONALITY: Warm, concise, human. Not robotic, not sales-heavy.`;
}

// ─── Gemini call with model fallback and retry ────────────────────────────────
async function callGemini(apiKey: string, promptText: string): Promise<string> {
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.15,
    },
  });

  for (const model of MODEL_CHAIN) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body }
        );

        if (res.status === 429 || res.status === 503 || res.status === 502) {
          // Rate limit or unavailable — wait then try next model
          if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
          continue;
        }

        if (!res.ok) {
          const err = await res.text().catch(() => "");
          console.error(`[pando/chat] Model ${model} HTTP ${res.status}:`, err.substring(0, 200));
          break; // Try next model
        }

        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          error?: { code: number; message: string; status: string };
        };

        if (data.error) {
          console.error(`[pando/chat] Model ${model} API error:`, data.error.status, data.error.message?.substring(0, 150));
          break;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`[pando/chat] Responded with model: ${model}`);
          return text;
        }
        break;
      } catch (err) {
        console.error(`[pando/chat] Fetch error on ${model}:`, err);
        break;
      }
    }
    // Wait before trying next model in chain
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error("All models unavailable");
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const body = await req.json() as {
      text: string;
      state?: {
        preferences?: Record<string, unknown>;
        visibleProperties?: Array<{ id: string; name: string; location: string; price?: number; type?: string; bedrooms?: number }>;
        selectedPropertyId?: string | null;
        authStep?: string | null;
        authTargetId?: string | null;
        savedPropertyIds?: string[];
      };
    };

    const { text, state = {} } = body;

    const contextPrompt = `CURRENT CONVERSATION STATE:
${JSON.stringify(state, null, 2)}

USER SAID: "${text}"

Respond ONLY with the JSON object (no other text).`;

    const fullPrompt = buildSystemPrompt() + "\n\n" + contextPrompt;

    const resultText = await callGemini(apiKey, fullPrompt);

    // Parse and validate JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(resultText);
    } catch {
      // Gemini sometimes wraps in ```json``` — strip it
      const cleaned = resultText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[pando/chat] Error:", msg);
    return NextResponse.json({ error: "Internal Server Error", detail: msg }, { status: 500 });
  }
}
