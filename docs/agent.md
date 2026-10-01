# Hi Pando — Coding Agent Instructions

## Role

You are the implementation agent responsible for converting the supplied Hi Pando visual reference into a working frontend.

Treat this repository as a visual implementation task first and a product architecture task second.

The primary source of truth is:

`assets/ui-reference.png`

The mascot source is:

`assets/pando-mascot.png`

## Required stack

Use:
- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion
- React Three Fiber / Three.js only where it materially improves the visual result
- Lucide React or another lightweight icon library

Avoid unnecessary dependencies.

## First task

Before writing code:
1. inspect both assets
2. inspect the reference dimensions
3. decompose the reference into visual regions
4. create a component plan
5. create design tokens
6. implement the desktop hero first

Do not immediately create a generic landing page.

## Component structure

Create at minimum:

```text
components/
  navbar/
    Navbar.tsx

  hero/
    Hero.tsx
    PandoMascot.tsx
    PandoScene.tsx
    FloatingQuestion.tsx
    ConversationBubble.tsx
    ConversationInput.tsx

  properties/
    PropertyCard.tsx
    PropertyGrid.tsx
    PropertyModal.tsx

  common/
    QuickPrompt.tsx
    FeatureStrip.tsx
```

Use sensible alternatives if the framework structure differs.

## State

Use local React state initially.

Suggested state:

```ts
type ConversationState =
  | "idle"
  | "collecting"
  | "understanding"
  | "recommendations";

interface SearchPreferences {
  propertyType?: "apartment" | "villa";
  location?: string;
  budget?: number;
  bedrooms?: number;
  lifestyle?: string[];
  query?: string;
}
```

No API calls are required.

## Mock data

Create a local dataset with at least 8 Dubai properties.

Each property should contain:

```ts
{
  id: string;
  name: string;
  location: string;
  type: "Apartment" | "Villa";
  bedrooms: number;
  bathrooms: number;
  price: number;
  image: string;
  tags: string[];
  description: string;
}
```

## Search behavior

The search does not need an LLM.

Implement simple deterministic intent extraction:
- detect apartment/villa
- detect number of bedrooms
- detect common Dubai areas
- detect budget values such as `2M`, `2 million`, `AED 2M`
- detect simple lifestyle keywords

Use the extracted preferences to filter/rank mock properties.

The UI should make this feel like Pando is understanding the user, without pretending a real AI model is running.

## Pando behavior

Pando is the center of the experience.

On pointer movement:
- move the visual scene slightly
- do not over-rotate
- maintain the mascot's recognizable orientation

Idle:
- gentle floating animation

After search:
- brief understanding state
- then reveal recommendations

Recommendation state:
- animate cards into view
- show why each property matches

## Visual implementation

Use CSS and DOM for:
- cards
- bubbles
- navigation
- buttons
- search
- text
- gradients

Use the supplied mascot image for Pando.

Do not flatten everything into one image.

If a true 3D model is not available, create a convincing 2.5D effect using:
- perspective
- transform
- parallax
- shadows
- orbital elements

Do not spend implementation time creating a new 3D mascot model unless a GLB asset is supplied.

## Visual QA

After implementation:
1. run the app
2. compare it against `assets/ui-reference.png`
3. fix composition
4. fix spacing
5. fix typography scale
6. fix mascot size/position
7. fix card positioning
8. fix color values
9. fix hero height
10. test responsive layouts

Prioritize these in that order.

## Acceptance criteria

The implementation is acceptable only if:
- Pando is the clear visual center
- the page resembles the supplied reference immediately
- the four brand colors are used correctly
- all visible controls work
- property cards are functional
- the search input changes UI state
- floating prompts work
- property details can be opened
- animations are smooth
- mobile does not overflow horizontally
- TypeScript/build succeeds
- there are no obvious placeholder elements

## Important

Do not ask the user to provide another design unless an essential asset is genuinely missing.

Make reasonable implementation decisions from the supplied reference.

Do not replace difficult visual elements with generic cards simply because they are faster to implement.
