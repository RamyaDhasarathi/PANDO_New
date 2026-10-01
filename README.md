# Hi Pando Frontend Build Package

This package contains the visual reference, mascot asset, and implementation instructions for building the Hi Pando frontend.

## Contents

```text
hi-pando-frontend-build-spec/
├── assets/
│   ├── pando-mascot.png
│   └── ui-reference.png
├── docs/
│   ├── design.md
│   ├── agent.md
│   └── plan.md
├── AGENTS.md
├── README.md
└── .gitignore
```

## How to use with a coding agent

Give the entire folder to the coding agent and tell it:

> Read `AGENTS.md`, `docs/design.md`, `docs/agent.md`, and `docs/plan.md` before implementing anything. Use `assets/ui-reference.png` as the visual source of truth and `assets/pando-mascot.png` as the central Pando mascot. Build the working frontend, not a screenshot.

The intended implementation is a frontend-only prototype.

## Intended stack

- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion
- Optional React Three Fiber / Three.js

## Backend

None required for the first milestone.

Use local mock property data and local state.

## Brand colors

- #b08699
- #a93400
- #ff3319
- #b5ffc2

## Primary visual rule

Pando must remain the center of the experience. The interface should feel like an AI property companion rather than a conventional property listing website.

## Running the app

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

Frontend only: mock properties live in `data/properties.ts`, Pando's "understanding" is the
deterministic parser in `lib/intentParser.ts`, and ranking/explanations are in `lib/recommend.ts`.
Property illustrations in `public/properties/` are original SVGs in the brand palette.
