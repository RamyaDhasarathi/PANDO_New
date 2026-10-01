# Hi Pando — Implementation Plan

## Phase 0 — Asset inspection

- [ ] Inspect `assets/ui-reference.png`
- [ ] Inspect `assets/pando-mascot.png`
- [ ] Confirm image dimensions and transparency
- [ ] Identify major layout coordinates
- [ ] Identify typography hierarchy
- [ ] Identify card sizes and spacing
- [ ] Identify major animation opportunities

## Phase 1 — Project setup

- [ ] Create Next.js + TypeScript app
- [ ] Configure Tailwind
- [ ] Install Framer Motion
- [ ] Install Lucide React
- [ ] Add optional React Three Fiber dependencies only if required
- [ ] Create global design tokens
- [ ] Add supplied assets

Target command:

```bash
npm install
npm run dev
```

## Phase 2 — Static visual reconstruction

Build the page with no complex interaction first.

- [ ] Navbar
- [ ] Hero background
- [ ] Left copy
- [ ] Central Pando
- [ ] Dubai/environment layer
- [ ] Floating prompts
- [ ] Left property card
- [ ] Right property card
- [ ] Conversation input
- [ ] Quick prompts
- [ ] Bottom feature strip

Goal:
Make the desktop page visually resemble the reference before adding behavior.

## Phase 3 — Pando animation

- [ ] Pando floating animation
- [ ] Pando shadow
- [ ] platform glow
- [ ] orbital ring
- [ ] particle accents
- [ ] cursor parallax
- [ ] reduced-motion fallback

## Phase 4 — Conversation interaction

- [ ] Create conversation state
- [ ] Make prompt bubbles clickable
- [ ] Make quick prompts populate input
- [ ] Make submit button work
- [ ] Show Pando response
- [ ] Show understanding state
- [ ] Transition to recommendation state

## Phase 5 — Property recommendation simulation

- [ ] Add 8+ mock Dubai properties
- [ ] Implement simple preference extraction
- [ ] Filter/rank properties
- [ ] Animate matching cards
- [ ] Add match explanation
- [ ] Add property detail modal

## Phase 6 — Responsive design

- [ ] Desktop 1536px target
- [ ] Desktop 1280px
- [ ] Tablet
- [ ] Mobile 390px
- [ ] Mobile 320px
- [ ] Check for horizontal overflow
- [ ] Check touch target sizes

## Phase 7 — Visual QA

Compare implementation with reference.

Check:
- [ ] Header placement
- [ ] Headline width
- [ ] Headline size
- [ ] Hero vertical alignment
- [ ] Pando scale
- [ ] Pando position
- [ ] Property card placement
- [ ] Bubble placement
- [ ] Input placement
- [ ] Color accuracy
- [ ] Border radius
- [ ] Shadows
- [ ] Background depth
- [ ] Feature strip

## Phase 8 — Performance

- [ ] Optimize images
- [ ] Lazy-load non-critical property images
- [ ] Avoid unnecessary animation re-renders
- [ ] Keep continuous animation lightweight
- [ ] Test on a mid-range laptop
- [ ] Respect reduced-motion preference

## Phase 9 — Final validation

Run:

```bash
npm run lint
npm run build
```

Then verify:
- no TypeScript errors
- no console errors
- all buttons work
- no broken images
- no horizontal scroll
- mobile layout works
- page loads without a backend

## Definition of done

The coding agent should leave a complete frontend that can be started with:

```bash
npm install
npm run dev
```

and visually resembles the supplied Hi Pando reference while providing real local interactions.
