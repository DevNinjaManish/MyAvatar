# MyAvatar V1 visual audit

## Focused design batch — 2026-09-12

- Rendered `design-mockups/v1-core-surfaces.html` at 1600 px and retained
  `design-mockups/v1-core-surfaces.png` as the stable inspection artifact.
- Verified five boards with no overlapping or clipped controls, missing bot
  portraits, or unreadable labels.
- Confirmed compact Ready, Listening, Understanding, and Paused mockups use
  identical widget and control geometry.
- Inspected the generated Working, Sleeping, and Recovery reference for Nova,
  Sterling, Rivit, and Luma. Identity, row/column consistency, state contrast,
  gutters, and crop are acceptable as design direction.
- Concept sheets remain non-production references; layered alpha assets and
  runtime state fixtures must pass a separate implementation audit.

## Production companion states — 2026-09-12

- Added the deterministic fixture at `qa/avatar-states.html` with state,
  Fast/Balanced profile, and reduced-motion query controls.
- Captured all nine states across Nova, Sterling, Rivit, and Luma at fixed
  240 × 390 geometry under `visual-qa/companion-states/`.
- Verified Ready, Listening, Understanding, Speaking, Working, Paused,
  Sleeping, Error, and Recovery. No crop, anchor, geometry, or identity shift
  was observed between captures.
- Initial QA found Sleeping and Error too dependent on status text. The renderer
  was revised with state-specific material dimming/tinting and the fixtures were
  regenerated. Sleeping now reads as intentionally dormant; Error is clearly
  distinct without destructive glitch motion; Recovery uses a cooler stabilizing
  treatment.
- Captured Balanced Speaking and Fast reduced-motion Working variants. Mouth
  amplitude remains visible and reduced motion preserves state meaning.
- Native Electron smoke verified Nova in Understanding with stable controls,
  full visibility, and no window movement or clipping.

## Current asset assessment

Nova, Rivit, Sterling, Luma, and the retained Pixel asset now share one canonical
three-layer pack. The polished portraits and existing transparent bodies keep
their established robot-family identity; transparent hands add optional body
language without changing face hardware.

## What already works

- Transparent bust assets fit the compact companion format.
- Each bot has a readable palette and accessory direction.
- Rivit's tools and rugged materials support his coding persona.
- Sterling's hat, bow tie, and navy/gold palette communicate the butler role.
- Luma's cyan/violet treatment suggests a technical-creative direction.
- Nova's rose/copper palette supports warmth and intimacy.

## What needs improvement for V1

### Stronger character differentiation

The bots currently share a similar front-facing mechanical bust language. V1 should distinguish them through silhouette, face geometry, eye design, mouth/speaker design, shoulder shape, and signature gestures—not only color and accessories.

### Animation readiness

The runtime separates portrait, body, and hands, then paints eyes, mouth,
presence lights, and effects into the portrait hardware at runtime. Further
separation is needed only when a state requires independent face plates or
character-specific props.

### Expressive faces

The current faces are visually striking but need authored expression states: attentive, amused, skeptical, sad, excited, tired, focused, affectionate, annoyed, and recovering.

### Voice visualization surfaces

Every bot needs a clear mouth or speaker surface that can support audio-reactive movement and lighting. The treatment should be unique per bot rather than a generic equalizer.

### Context and work identity

Each bot needs signature work animations tied to its specialization: Rivit's diagnostic/tool behavior, Luma's visual exploration, Nova's planning/relationship cues, and Sterling's organized assistant routines.

## V1 visual design completion criteria

The bot visual designs are ready when each bot has:

- Approved silhouette and front/idle composition
- Layered 2.5D asset breakdown
- Palette and lighting rules
- Eye, mouth, and voice visualization design
- At least eight emotional/attention states
- Idle, listening, thinking, speaking, working, sleeping, broken, and recovery motions
- Bot-specific sound and reaction direction
- Fast/Balanced rendering rules
- Visual regression references

## Current implementation decision

Use the canonical asset pack directly. Keep eye, speaker, and light behavior in
the runtime; keep hands optional and below the live face. Future art changes
replace stable filenames only after compact visual QA, alpha validation, Fast
mode review, and Git-backed comparison.
