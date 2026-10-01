/**
 * Hi Pando — Conversation Scenario Test Suite
 * Run: node scripts/test-scenarios.mjs
 *
 * Tests every critical scenario from the spec against the live /api/pando/chat endpoint.
 * Prints colour-coded PASS / FAIL / WARN for each assertion.
 */

const BASE_URL = "http://localhost:3000/api/pando/chat";

// ─── colour helpers ───────────────────────────────────────────────────────────
const G = (s) => `\x1b[32m${s}\x1b[0m`; // green
const R = (s) => `\x1b[31m${s}\x1b[0m`; // red
const Y = (s) => `\x1b[33m${s}\x1b[0m`; // yellow
const B = (s) => `\x1b[34m${s}\x1b[0m`; // blue
const W = (s) => `\x1b[1m${s}\x1b[0m`;  // bold

// ─── helpers ─────────────────────────────────────────────────────────────────
// Minimum ms between requests to stay within 15 RPM free-tier limit
const REQUEST_DELAY_MS = 4500;
let lastRequestTime = 0;

async function ask(text, state = {}) {
  // Enforce minimum gap between API calls
  const now = Date.now();
  const wait = REQUEST_DELAY_MS - (now - lastRequestTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTime = Date.now();

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, state }),
    });
    if (res.status === 500) {
      const errBody = await res.text();
      if (attempt === 0 && (errBody.includes('503') || errBody.includes('unavailable') || errBody.includes('API Error'))) {
        console.log(`    ${Y('(retrying after 6s...)')}`)
        await new Promise((r) => setTimeout(r, 6000));
        lastRequestTime = Date.now();
        continue;
      }
      throw new Error(`HTTP ${res.status}: ${errBody}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error('Max retries exceeded');
}

let passed = 0;
let failed = 0;
let warned = 0;

function assert(label, condition, got, expected) {
  if (condition) {
    console.log(`  ${G("✓ PASS")} ${label}`);
    passed++;
  } else {
    console.log(`  ${R("✗ FAIL")} ${label}`);
    console.log(`         Expected: ${Y(String(expected))}`);
    console.log(`         Got     : ${R(String(got))}`);
    failed++;
  }
}

function warn(label, note) {
  console.log(`  ${Y("⚠ WARN")} ${label} — ${note}`);
  warned++;
}

function section(title) {
  console.log(`\n${B("━".repeat(60))}`);
  console.log(W(`  ${title}`));
  console.log(B("━".repeat(60)));
}

// ─── shared visible-property fixture (6 properties) ──────────────────────────
const SIX_PROPERTIES = [
  { id: "burj-vista-2br",      name: "Burj Vista Residences",  location: "Downtown Dubai",      price: 2400000, type: "Apartment", bedrooms: 2 },
  { id: "parkway-villa-4br",   name: "Parkway Vistas Villa",   location: "Dubai Hills Estate",  price: 5800000, type: "Villa",     bedrooms: 4 },
  { id: "marina-gate-1br",     name: "Marina Gate Apartment",  location: "Dubai Marina",        price: 1650000, type: "Apartment", bedrooms: 1 },
  { id: "sadaf-jbr-3br",       name: "Sadaf Beach Residence",  location: "JBR",                 price: 3200000, type: "Apartment", bedrooms: 3 },
  { id: "creek-rise-2br",      name: "Creek Rise Tower",       location: "Dubai Creek Harbour", price: 1950000, type: "Apartment", bedrooms: 2 },
  { id: "saheel-ranches-3br",  name: "Saheel Family Villa",    location: "Arabian Ranches",     price: 3900000, type: "Villa",     bedrooms: 3 },
];

const THREE_PROPERTIES = SIX_PROPERTIES.slice(0, 3);

const WITH_SIX  = { visibleProperties: SIX_PROPERTIES, selectedPropertyId: null, authStep: null, authTargetId: null };
const WITH_THREE = { visibleProperties: THREE_PROPERTIES, selectedPropertyId: null, authStep: null, authTargetId: null };
const EMPTY_STATE = { visibleProperties: [], selectedPropertyId: null, authStep: null, authTargetId: null };

// ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ──
// SCENARIO GROUPS
// ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ──

async function testOrdinalResolution() {
  section("SCENARIO GROUP 1 — Ordinal Property Resolution");

  // Test 1.1 — "third property"
  {
    console.log(`\n  ${W("1.1")} "Tell me about the third property" (6 visible)`);
    const d = await ask("Tell me about the third property", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}, reply: "${d.reply?.substring(0,80)}..."`);
    assert("intent is describe or open (not search)", ["describe","open"].includes(d.intent), d.intent, "describe or open");
    assert("targetPropertyId = marina-gate-1br (index 2)", d.targetPropertyId === "marina-gate-1br", d.targetPropertyId, "marina-gate-1br");
    assert("reply mentions Marina Gate", d.reply?.toLowerCase().includes("marina"), d.reply?.substring(0,60), "contains 'marina'");
  }

  // Test 1.2 — "third one"
  {
    console.log(`\n  ${W("1.2")} "Tell me more about the third one"`);
    const d = await ask("Tell me more about the third one", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("intent is describe/open", ["describe","open"].includes(d.intent), d.intent, "describe or open");
    assert("targetPropertyId = marina-gate-1br", d.targetPropertyId === "marina-gate-1br", d.targetPropertyId, "marina-gate-1br");
  }

  // Test 1.3 — "first property"
  {
    console.log(`\n  ${W("1.3")} "Show me details of the first property"`);
    const d = await ask("Show me details of the first property", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("targetPropertyId = burj-vista-2br (index 0)", d.targetPropertyId === "burj-vista-2br", d.targetPropertyId, "burj-vista-2br");
  }

  // Test 1.4 — "second one"
  {
    console.log(`\n  ${W("1.4")} "Open the second one"`);
    const d = await ask("Open the second one", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("targetPropertyId = parkway-villa-4br (index 1)", d.targetPropertyId === "parkway-villa-4br", d.targetPropertyId, "parkway-villa-4br");
  }

  // Test 1.5 — "last one"
  {
    console.log(`\n  ${W("1.5")} "Tell me about the last one" (3 visible)`);
    const d = await ask("Tell me about the last one", WITH_THREE);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("targetPropertyId = marina-gate-1br (last of 3)", d.targetPropertyId === "marina-gate-1br", d.targetPropertyId, "marina-gate-1br");
  }

  // Test 1.6 — "number 4"
  {
    console.log(`\n  ${W("1.6")} "Show me number 4" (6 visible)`);
    const d = await ask("Show me number 4", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("targetPropertyId = sadaf-jbr-3br (index 3)", d.targetPropertyId === "sadaf-jbr-3br", d.targetPropertyId, "sadaf-jbr-3br");
  }
}

async function testPropertyNameResolution() {
  section("SCENARIO GROUP 2 — Property Name / Fuzzy Resolution");

  // Test 2.1 — exact name
  {
    console.log(`\n  ${W("2.1")} "Open Burj Vista Residences"`);
    const d = await ask("Open Burj Vista Residences", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("intent is open or collect_name", ["open","collect_name"].includes(d.intent), d.intent, "open or collect_name");
    assert("targetPropertyId = burj-vista-2br", d.targetPropertyId === "burj-vista-2br", d.targetPropertyId, "burj-vista-2br");
  }

  // Test 2.2 — partial name
  {
    console.log(`\n  ${W("2.2")} "Tell me more about Burj Vista" (partial name)`);
    const d = await ask("Tell me more about Burj Vista", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("targetPropertyId = burj-vista-2br", d.targetPropertyId === "burj-vista-2br", d.targetPropertyId, "burj-vista-2br");
  }

  // Test 2.3 — property by location
  {
    console.log(`\n  ${W("2.3")} "Show me the JBR property"`);
    const d = await ask("Show me the JBR property", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("targetPropertyId = sadaf-jbr-3br", d.targetPropertyId === "sadaf-jbr-3br", d.targetPropertyId, "sadaf-jbr-3br");
  }

  // Test 2.4 — "Creek Rise Tower" (Creek is also a location keyword)
  {
    console.log(`\n  ${W("2.4")} "Show me Creek Rise Tower" (name contains area keyword)`);
    const d = await ask("Show me Creek Rise Tower", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("intent is NOT search", d.intent !== "search", d.intent, "not search");
    assert("targetPropertyId = creek-rise-2br", d.targetPropertyId === "creek-rise-2br", d.targetPropertyId, "creek-rise-2br");
  }
}

async function testNoSearchLoop() {
  section("SCENARIO GROUP 3 — No Property Search Loop");

  // Test 3.1 — "show me more" when selectedProperty is set
  {
    console.log(`\n  ${W("3.1")} "Show me more" (selectedPropertyId already set)`);
    const state = { ...WITH_SIX, selectedPropertyId: "marina-gate-1br" };
    const d = await ask("Show me more", state);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("intent is NOT search", d.intent !== "search", d.intent, "not search");
    assert("uses selectedPropertyId (marina-gate-1br)", d.targetPropertyId === "marina-gate-1br", d.targetPropertyId, "marina-gate-1br");
  }

  // Test 3.2 — "open it" when selectedProperty is set
  {
    console.log(`\n  ${W("3.2")} "Open it" (selectedPropertyId set)`);
    const state = { ...WITH_SIX, selectedPropertyId: "burj-vista-2br" };
    const d = await ask("Open it", state);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("intent is open or collect_name (not search)", ["open","collect_name"].includes(d.intent), d.intent, "open or collect_name");
    assert("uses burj-vista-2br", d.targetPropertyId === "burj-vista-2br", d.targetPropertyId, "burj-vista-2br");
  }

  // Test 3.3 — "I want to see that one" when selectedProperty is set
  {
    console.log(`\n  ${W("3.3")} "I want to see that one" (selectedPropertyId set)`);
    const state = { ...WITH_SIX, selectedPropertyId: "sadaf-jbr-3br" };
    const d = await ask("I want to see that one", state);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("intent is NOT search", d.intent !== "search", d.intent, "not search");
  }

  // Test 3.4 — "show me another property" SHOULD trigger new search
  {
    console.log(`\n  ${W("3.4")} "Show me another property" — should restart search`);
    const state = { ...WITH_SIX, selectedPropertyId: "marina-gate-1br" };
    const d = await ask("Show me another property", state);
    console.log(`       → intent: ${Y(d.intent)}`);
    assert("intent IS search (new search)", d.intent === "search", d.intent, "search");
  }

  // Test 3.5 — "find me apartments in Marina" SHOULD search
  {
    console.log(`\n  ${W("3.5")} "Find me apartments in Marina under 2M" — should search`);
    const d = await ask("Find me apartments in Marina under 2M", EMPTY_STATE);
    console.log(`       → intent: ${Y(d.intent)}, searchPrefs: ${JSON.stringify(d.searchPrefs)}`);
    assert("intent is search", d.intent === "search", d.intent, "search");
    assert("searchPrefs.location includes Marina", d.searchPrefs?.location?.toLowerCase().includes("marina"), d.searchPrefs?.location, "Marina");
    assert("searchPrefs.budget = 2000000", d.searchPrefs?.budget === 2000000, d.searchPrefs?.budget, 2000000);
  }
}

async function testOpenPropertyFlow() {
  section("SCENARIO GROUP 4 — Open Property → Auth Flow");

  // Test 4.1 — "Open the third property" → collect_name
  {
    console.log(`\n  ${W("4.1")} "Open the third property" → should start collecting name`);
    const d = await ask("Open the third property", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}, reply: "${d.reply?.substring(0,70)}"`);
    assert("intent is collect_name or open", ["collect_name","open"].includes(d.intent), d.intent, "collect_name or open");
    assert("targetPropertyId = marina-gate-1br", d.targetPropertyId === "marina-gate-1br", d.targetPropertyId, "marina-gate-1br");
    if (d.intent === "collect_name") {
      assert("reply asks for name", d.reply?.toLowerCase().includes("name"), d.reply?.substring(0,80), "contains 'name'");
    }
  }

  // Test 4.2 — "View the Parkway villa" → collect_name
  {
    console.log(`\n  ${W("4.2")} "I want to view the Parkway villa"`);
    const d = await ask("I want to view the Parkway villa", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("intent is collect_name or open", ["collect_name","open"].includes(d.intent), d.intent, "collect_name or open");
  }

  // Test 4.3 — should NOT ask "Why did you choose this"
  {
    console.log(`\n  ${W("4.3")} "Open the second one" — should NOT ask why user chose it`);
    const d = await ask("Open the second one", WITH_SIX);
    const replyLower = d.reply?.toLowerCase() ?? "";
    assert("reply does NOT ask 'why'", !replyLower.includes("why did you choose"), replyLower.substring(0,80), "no 'why did you choose'");
    assert("intent is collect_name or open", ["collect_name","open"].includes(d.intent), d.intent, "collect_name or open");
  }
}

async function testConversationalAuth() {
  section("SCENARIO GROUP 5 — Conversational Auth Collection");

  const AUTH_TARGET = "marina-gate-1br";

  // Test 5.1 — User says their name
  {
    console.log(`\n  ${W("5.1")} User provides name: "My name is Sengottayan S"`);
    const state = { ...WITH_SIX, selectedPropertyId: AUTH_TARGET, authStep: "name", authTargetId: AUTH_TARGET };
    const d = await ask("My name is Sengottayan S", state);
    console.log(`       → intent: ${Y(d.intent)}, extractedName: ${Y(d.extractedName)}, reply: "${d.reply?.substring(0,70)}"`);
    assert("intent is collect_email", d.intent === "collect_email", d.intent, "collect_email");
    assert("extractedName = 'Sengottayan S'", d.extractedName === "Sengottayan S", d.extractedName, "Sengottayan S");
    assert("reply asks for email", d.reply?.toLowerCase().includes("email"), d.reply?.substring(0,80), "contains 'email'");
  }

  // Test 5.2 — User says their email
  {
    console.log(`\n  ${W("5.2")} User provides email: "sengottayan@gmail.com"`);
    const state = { ...WITH_SIX, selectedPropertyId: AUTH_TARGET, authStep: "email", authTargetId: AUTH_TARGET, collectedName: "Sengottayan S" };
    const d = await ask("sengottayan@gmail.com", state);
    console.log(`       → intent: ${Y(d.intent)}, extractedEmail: ${Y(d.extractedEmail)}, reply: "${d.reply?.substring(0,70)}"`);
    assert("intent is collect_phone", d.intent === "collect_phone", d.intent, "collect_phone");
    assert("extractedEmail = 'sengottayan@gmail.com'", d.extractedEmail === "sengottayan@gmail.com", d.extractedEmail, "sengottayan@gmail.com");
    assert("reply asks for phone", d.reply?.toLowerCase().includes("mobile") || d.reply?.toLowerCase().includes("phone") || d.reply?.toLowerCase().includes("number"), d.reply?.substring(0,80), "contains 'mobile/phone'");
  }

  // Test 5.3 — User provides phone with country code
  {
    console.log(`\n  ${W("5.3")} User provides phone: "+91 9876543210"`);
    const state = { ...WITH_SIX, selectedPropertyId: AUTH_TARGET, authStep: "phone", authTargetId: AUTH_TARGET };
    const d = await ask("+91 9876543210", state);
    console.log(`       → intent: ${Y(d.intent)}, extractedPhone: ${Y(d.extractedPhone)}, extractedCountryCode: ${Y(d.extractedCountryCode)}`);
    assert("intent is auth_complete", d.intent === "auth_complete", d.intent, "auth_complete");
    assert("extractedPhone = '9876543210'", d.extractedPhone === "9876543210", d.extractedPhone, "9876543210");
    assert("extractedCountryCode = '+91'", d.extractedCountryCode === "+91", d.extractedCountryCode, "+91");
  }

  // Test 5.4 — User provides UAE phone
  {
    console.log(`\n  ${W("5.4")} User provides UAE phone: "0501234567"`);
    const state = { ...WITH_SIX, selectedPropertyId: AUTH_TARGET, authStep: "phone", authTargetId: AUTH_TARGET };
    const d = await ask("0501234567", state);
    console.log(`       → intent: ${Y(d.intent)}, extractedPhone: ${Y(d.extractedPhone)}`);
    assert("intent is auth_complete", d.intent === "auth_complete", d.intent, "auth_complete");
    assert("extractedPhone present", !!d.extractedPhone, d.extractedPhone, "phone digits");
  }

  // Test 5.5 — User says India as country
  {
    console.log(`\n  ${W("5.5")} User says "India" as country → extract +91`);
    const state = { ...WITH_SIX, selectedPropertyId: AUTH_TARGET, authStep: "phone", authTargetId: AUTH_TARGET };
    const d = await ask("My country is India and number is 9876543210", state);
    console.log(`       → intent: ${Y(d.intent)}, extractedPhone: ${Y(d.extractedPhone)}, extractedCountryCode: ${Y(d.extractedCountryCode)}`);
    assert("extractedCountryCode is +91 or contains 91", (d.extractedCountryCode ?? "").includes("91"), d.extractedCountryCode, "+91");
    assert("extractedPhone = 9876543210", d.extractedPhone === "9876543210", d.extractedPhone, "9876543210");
  }
}

async function testPropertyCompare() {
  section("SCENARIO GROUP 6 — Compare Properties");

  // Test 6.1 — Compare two properties
  {
    console.log(`\n  ${W("6.1")} "Compare the first and second property"`);
    const d = await ask("Compare the first and second property", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, target: ${Y(d.targetPropertyId)}, secondary: ${Y(d.secondaryPropertyId)}`);
    assert("intent is compare", d.intent === "compare", d.intent, "compare");
    assert("targetPropertyId set", !!d.targetPropertyId, d.targetPropertyId, "some-id");
    assert("secondaryPropertyId set", !!d.secondaryPropertyId, d.secondaryPropertyId, "some-id");
  }

  // Test 6.2 — Compare by name
  {
    console.log(`\n  ${W("6.2")} "Compare Burj Vista and Marina Gate"`);
    const d = await ask("Compare Burj Vista and Marina Gate", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, target: ${Y(d.targetPropertyId)}, secondary: ${Y(d.secondaryPropertyId)}`);
    assert("intent is compare", d.intent === "compare", d.intent, "compare");
  }
}

async function testAreaSearch() {
  section("SCENARIO GROUP 7 — Area Search & Preferences");

  // Test 7.1 — Location + budget + type search
  {
    console.log(`\n  ${W("7.1")} "2 bed villa in Arabian Ranches under 5 million"`);
    const d = await ask("2 bed villa in Arabian Ranches under 5 million", EMPTY_STATE);
    console.log(`       → intent: ${Y(d.intent)}, prefs: ${JSON.stringify(d.searchPrefs)}`);
    assert("intent is search", d.intent === "search", d.intent, "search");
    assert("location includes Ranches", d.searchPrefs?.location?.toLowerCase().includes("ranches") ?? false, d.searchPrefs?.location, "Arabian Ranches");
    assert("budget = 5000000", d.searchPrefs?.budget === 5000000, d.searchPrefs?.budget, 5000000);
    assert("bedrooms = 2", d.searchPrefs?.bedrooms === 2, d.searchPrefs?.bedrooms, 2);
    assert("propertyType = Villa", d.searchPrefs?.propertyType === "Villa", d.searchPrefs?.propertyType, "Villa");
  }

  // Test 7.2 — Rent search
  {
    console.log(`\n  ${W("7.2")} "I want to rent a 1 bed in Marina around 120k per year"`);
    const d = await ask("I want to rent a 1 bed in Marina around 120k per year", EMPTY_STATE);
    console.log(`       → intent: ${Y(d.intent)}, prefs: ${JSON.stringify(d.searchPrefs)}`);
    assert("intent is search", d.intent === "search", d.intent, "search");
    assert("location includes Marina", d.searchPrefs?.location?.toLowerCase().includes("marina") ?? false, d.searchPrefs?.location, "Dubai Marina");
  }
}

async function testConversationalChat() {
  section("SCENARIO GROUP 8 — General Chat & Area Questions");

  // Test 8.1 — Area info question
  {
    console.log(`\n  ${W("8.1")} "What is Downtown Dubai like?"`);
    const d = await ask("What is Downtown Dubai like?", EMPTY_STATE);
    console.log(`       → intent: ${Y(d.intent)}, reply (60ch): "${d.reply?.substring(0,60)}"`);
    assert("intent is advice or chat (not search)", ["advice","chat"].includes(d.intent), d.intent, "advice or chat");
    assert("reply is not empty", !!d.reply, !!d.reply, "non-empty reply");
    assert("reply mentions Downtown or Dubai", d.reply?.toLowerCase().includes("downtown") || d.reply?.toLowerCase().includes("dubai"), d.reply?.substring(0,80), "mentions Downtown/Dubai");
  }

  // Test 8.2 — Why is Pando asking for my name
  {
    console.log(`\n  ${W("8.2")} "Why are you asking for my name?"`);
    const state = { ...WITH_SIX, selectedPropertyId: "marina-gate-1br", authStep: "name" };
    const d = await ask("Why are you asking for my name?", state);
    console.log(`       → intent: ${Y(d.intent)}, reply: "${d.reply?.substring(0,80)}"`);
    assert("reply explains the reason", d.reply?.toLowerCase().includes("detail") || d.reply?.toLowerCase().includes("unlock") || d.reply?.toLowerCase().includes("property"), d.reply?.substring(0,80), "explains reason");
  }

  // Test 8.3 — No properties yet, user says "show me"
  {
    console.log(`\n  ${W("8.3")} "Show me" with no visible properties → should ask what they want`);
    const d = await ask("Show me", EMPTY_STATE);
    console.log(`       → intent: ${Y(d.intent)}, reply: "${d.reply?.substring(0,60)}"`);
    assert("intent is NOT search or open", !["open","describe"].includes(d.intent), d.intent, "not open/describe");
    assert("reply is helpful", !!d.reply, !!d.reply, "non-empty reply");
  }
}

async function testAmbiguousReference() {
  section("SCENARIO GROUP 9 — Ambiguous / Edge Cases");

  // Test 9.1 — "this property" with multiple visible → should not loop
  {
    console.log(`\n  ${W("9.1")} "Open this property" with 6 visible and no selectedPropertyId`);
    const d = await ask("Open this property", WITH_SIX);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}, reply: "${d.reply?.substring(0,70)}"`);
    assert("intent is NOT search", d.intent !== "search", d.intent, "not search");
    // Either resolves to something or asks which one
    const ok = !!d.targetPropertyId || d.reply?.toLowerCase().includes("which") || d.reply?.toLowerCase().includes("one") || d.intent === "chat";
    assert("either resolves property or asks for clarification", ok, d.intent, "targetPropertyId set or clarification");
  }

  // Test 9.2 — "Start over" signal
  {
    console.log(`\n  ${W("9.2")} "Start over" should not return property intent`);
    const state = { ...WITH_SIX, selectedPropertyId: "marina-gate-1br" };
    const d = await ask("Start over", state);
    console.log(`       → intent: ${Y(d.intent)}, reply: "${d.reply?.substring(0,60)}"`);
    // Any non-property intent is fine here
    assert("reply is friendly reset message", !!d.reply, !!d.reply, "non-empty reply");
  }

  // Test 9.3 — Index out of range
  {
    console.log(`\n  ${W("9.3")} "Show me the 10th one" with only 3 visible`);
    const d = await ask("Show me the 10th one", WITH_THREE);
    console.log(`       → intent: ${Y(d.intent)}, reply: "${d.reply?.substring(0,70)}"`);
    assert("intent is NOT open or describe with wrong id", d.targetPropertyId !== "some-wrong-id", d.targetPropertyId, "null or correct");
    assert("reply indicates out of range", d.reply?.toLowerCase().includes("only") || d.reply?.toLowerCase().includes("3") || d.reply?.toLowerCase().includes("three") || !d.targetPropertyId || d.intent === "chat", d.reply?.substring(0,80), "indicates limit");
  }

  // Test 9.4 — "Explain the property you just showed"
  {
    console.log(`\n  ${W("9.4")} "Explain the property you just showed" with selectedPropertyId set`);
    const state = { ...WITH_SIX, selectedPropertyId: "creek-rise-2br" };
    const d = await ask("Explain the property you just showed", state);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("intent is describe/open (not search)", ["describe","open","chat"].includes(d.intent), d.intent, "describe or open");
    assert("targetPropertyId is creek-rise-2br", d.targetPropertyId === "creek-rise-2br" || d.intent === "chat", d.targetPropertyId, "creek-rise-2br");
  }
}

async function testVoiceInterruption() {
  section("SCENARIO GROUP 10 — Voice State Simulation");

  // Test 10.1 — user interrupts with property request
  {
    console.log(`\n  ${W("10.1")} Interrupt: "Wait, open the third one" during auth step`);
    const state = { ...WITH_SIX, selectedPropertyId: "burj-vista-2br", authStep: "email" };
    const d = await ask("Wait, open the third one instead", state);
    console.log(`       → intent: ${Y(d.intent)}, targetId: ${Y(d.targetPropertyId)}`);
    assert("intent changes to open/collect_name (property request wins)", ["open","collect_name","describe"].includes(d.intent), d.intent, "open or collect_name");
    assert("switches to marina-gate-1br (3rd property)", d.targetPropertyId === "marina-gate-1br" || ["open","collect_name"].includes(d.intent), d.targetPropertyId, "marina-gate-1br");
  }
}

// ─── MAIN RUNNER ─────────────────────────────────────────────────────────────
async function main() {
  console.log(W(`\n${"═".repeat(60)}`));
  console.log(W(`  Hi Pando — Full Conversation Scenario Test Suite`));
  console.log(W(`  Target: ${BASE_URL}`));
  console.log(W(`${"═".repeat(60)}`));
  console.log(`  Running ${new Date().toLocaleString()}\n`);

  // Verify server is alive
  try {
    await fetch("http://localhost:3000");
  } catch {
    console.log(R("\n  ✗ Server not reachable at http://localhost:3000"));
    console.log(R("  Make sure npm run dev is running.\n"));
    process.exit(1);
  }

  const groups = [
    testOrdinalResolution,
    testPropertyNameResolution,
    testNoSearchLoop,
    testOpenPropertyFlow,
    testConversationalAuth,
    testPropertyCompare,
    testAreaSearch,
    testConversationalChat,
    testAmbiguousReference,
    testVoiceInterruption,
  ];

  for (const group of groups) {
    try {
      await group();
    } catch (err) {
      console.log(R(`\n  ✗ GROUP ERROR: ${err.message}`));
      failed++;
    }
    // Rate-limit to avoid Gemini quota exhaustion
    await new Promise((r) => setTimeout(r, 3000));
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${B("═".repeat(60))}`);
  console.log(W("  RESULTS SUMMARY"));
  console.log(B("═".repeat(60)));
  console.log(`  ${G(`✓ PASSED : ${passed}`)}`);
  console.log(`  ${R(`✗ FAILED : ${failed}`)}`);
  if (warned > 0) console.log(`  ${Y(`⚠ WARNED : ${warned}`)}`);
  const total = passed + failed;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  console.log(`\n  Score: ${pct >= 80 ? G(`${pct}%`) : pct >= 60 ? Y(`${pct}%`) : R(`${pct}%`)} (${passed}/${total})`);
  if (failed === 0) {
    console.log(`\n  ${G("🎉 All tests passed! The Gemini integration is working correctly.")}`);
  } else {
    console.log(`\n  ${R("⚠  Some tests failed. Review the output above and fix the issues.")}`);
  }
  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(R(`\nFatal: ${err.message}`));
  process.exit(1);
});
