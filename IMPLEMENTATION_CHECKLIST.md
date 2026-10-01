# Hi Pando POC Checklist

- [x] Single-page state flow
- [x] No route/page navigation
- [x] Conversation input
- [x] Basic intent extraction
- [x] Understanding state
- [x] Mock property dataset
- [x] Recommendation scoring
- [x] Property cards
- [x] Property selection
- [x] Sign-in gate
- [x] Property detail
- [x] Back to recommendations
- [x] Existing UI preserved
- [x] No-scroll viewport preserved
- [x] Responsive layout
- [x] npm run lint
- [x] npm run build
- [x] Full user flow tested

## Notes

- States (`lib/appState.ts`): `welcome` → `conversation` → `understanding` → `recommendations` → `auth` → `property`, derived from the conversation phase plus a small `useReducer` for select → sign-in → detail. Everything stays on `/`.
- Intent extraction: `lib/intentParser.ts` (keywords/regex). Ranking: `lib/recommend.ts` (budget, location, bedrooms, type, lifestyle), returns 2–4 homes.
- Dataset: `data/properties.ts` (10 Dubai homes, now with amenities).
- Sign-in is simulated (`components/ui/SignInGate.tsx`); no auth provider.
- Flow verified in Chrome at 1536×900, 1366×768, 1024×768 and 390×844: URL `/` at every step, zero navigations, no console errors, no page scroll on desktop.
