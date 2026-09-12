# MyAvatar V1 visual audit

## Current asset assessment

The current Nova, Rivit, Sterling, and Luma busts provide a coherent robot-family foundation and are useful MVP assets. They are not yet final V1 visual designs.

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

Each bot needs separable layers or animation-ready variants for eyes, mouth, lights, face plates, neck, shoulders, and effects. A single flattened bust image cannot deliver the required liveness system.

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

Use the current assets as provisional V1 placeholders. Build the renderer, state machine, voice equalizer, lights, animation timing, panels, and visual QA around stable asset slots. Do not invest in detailed asset polish during the current implementation cycle.

The final art pass is pending, but it is not blocked on a particular image
generation tool. New assets must preserve the established bot identities and
runtime contracts so replacement does not require a product rewrite.

## Recommendation for deferred art pass

When the art pass begins, keep the current assets as visual references but improve the parts that affect identity, expression, layering, and motion first. Do not redraw everything automatically.
