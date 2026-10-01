# Hi Pando — Design Specification

## 1. Purpose

Build the Hi Pando landing page as a real, responsive frontend. The supplied `assets/ui-reference.png` is the visual source of truth for the first implementation.

Do NOT use the reference screenshot as the page background. Reconstruct the interface with real HTML/React components, CSS, animations, and local assets.

The supplied `assets/pando-mascot.png` is the Pando mascot and must be the central visual element.

## 2. Visual target

Target desktop composition: approximately 1536 × 900.

The page should visually reproduce the reference in:
- overall composition
- hierarchy
- spacing
- proportions
- color palette
- rounded corners
- typography hierarchy
- card styling
- lighting and gradients
- mascot placement
- floating interaction bubbles
- property cards
- conversational input
- bottom feature strip

The first milestone is desktop visual fidelity. Responsive behavior comes after the desktop composition is correct.

## 3. Brand palette

Use these exact colors as the core palette:

```css
--pando-mauve: #b08699;
--pando-brown: #a93400;
--pando-coral: #ff3319;
--pando-mint: #b5ffc2;
```

Do not introduce a large unrelated color palette. Neutral colors may be used for readability, white/off-white for cards, and dark charcoal for text.

Suggested usage:
- `#b08699`: hero/environment surfaces and mauve gradients
- `#a93400`: secondary brand text, icon accents, deep orange/brown elements
- `#ff3319`: primary CTA, Pando body, active states
- `#b5ffc2`: AI/highlight state, mint accents, selected states

## 4. Page structure

### Header

Left:
- Pando mascot icon
- `hi pando` wordmark

Center:
- Buy
- Rent
- Off Plan
- Communities
- How it works

Right:
- language selector
- Sign in
- Sign up

Header is clean, transparent/light, and sits over the hero.

### Hero left side

Eyebrow:
`YOUR AI PROPERTY COMPANION`

Headline:
`Find a place that feels like home.`

The word `home.` is emphasized in orange/red.

Supporting copy:
`Tell Pando what you’re looking for, and get personalised property recommendations in Dubai.`

### Hero center

Pando mascot:
- use `assets/pando-mascot.png`
- large
- centered
- visually dominant
- floating slightly above a circular glowing platform
- subtle shadow
- subtle breathing animation
- slight cursor/parallax response

Do not redraw the mascot with CSS. Use the supplied asset.

### Hero right / surrounding Pando

Floating conversational prompts:
- `Hi! I'm Pando`
- `Tell me what kind of home you're looking for, and I'll find the best options for you.`
- `What's your budget range?`
- `Any specific lifestyle needs?`
- `Which area interests you?`
- `Apartments or Villas?`

These must be real interactive buttons/cards, not images.

### Property cards

Reference cards:
1. Downtown Dubai
   - 2 Bedroom Apartment
   - AED 2.4M

2. Dubai Hills Estate
   - 4 Bedroom Villa
   - AED 5.8M

Use local mock data. Property images can initially be local placeholders or generated/selected assets, but the layout must match the reference.

### Conversational input

Centered near the bottom of the hero:
- microphone button
- placeholder: `Tell Pando what you're looking for...`
- send button

Quick prompts:
- Near the beach
- Under AED 2M
- Family friendly
- Spacious 3BR
- Modern apartment

### Bottom feature strip

Four items:
- Talk naturally — Just like a conversation
- Personalised recommendations — Matched to your lifestyle
- Save time — Fewer, better options
- Find your home — With confidence

## 5. Background treatment

The reference has a warm Dubai-inspired environment.

Build this in layers:
1. base mauve/peach gradient
2. subtle Dubai skyline/background
3. warm floor/interior treatment
4. atmospheric highlights
5. Pando platform
6. orbital lines/particles
7. UI cards

The background must not overpower Pando.

If no licensed skyline image is available, use a tasteful CSS/gradient/silhouette treatment instead of inventing photorealistic landmarks.

## 6. Animation

Use Framer Motion for UI animation.

Pando:
- gentle vertical float
- very subtle rotation
- cursor parallax on desktop

Cards:
- slight depth movement
- entrance animation
- hover/tap lift

Floating prompts:
- subtle floating motion
- staggered entrance

Orbit:
- slow continuous rotation

Search interaction:
- state transitions should feel smooth and intentional

Respect `prefers-reduced-motion`.

## 7. Responsive rules

Desktop:
- preserve the reference composition
- Pando remains the central focus

Tablet:
- reduce card sizes
- reduce navigation spacing
- retain Pando prominence

Mobile:
- stack content
- Pando remains above the conversational input
- floating cards become a horizontal/vertical list
- property cards become a swipeable/stacked section
- navigation collapses

Never simply scale the 1536px screenshot down.

## 8. Interaction behavior

Initial state:
- Pando is central
- user sees conversational entry point
- recommendations should not dominate before interaction

When user types/selects a prompt:
- update local conversation state
- show a short Pando response
- reveal matching mock properties
- animate properties into the scene

Clicking a property:
- open a detail modal/panel
- show image, name, price, type, bedrooms and short match explanation

No backend is required for this milestone.

## 9. Typography

Use a modern geometric sans-serif.

Recommended:
- Inter, Geist, or another clean modern sans-serif

Typography should be:
- bold/large for headline
- medium for navigation
- compact for property metadata
- readable on mobile

## 10. Do not

- do not use the reference screenshot as a background
- do not recreate the mascot with generic CSS
- do not use random stock UI components
- do not add unrelated colors
- do not create a generic real-estate dashboard
- do not add backend/API dependencies for this milestone
- do not leave fake buttons that do nothing
