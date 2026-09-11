# MyAvatar V1 design plan

## Design goal

V1 should feel like a living 2.5D companion that can also help with focused work. The design must make emotional presence, voice state, context use, specialist work, permissions, and recovery understandable without turning the interface into a dashboard.

## Design deliverables

Each major surface receives three artifacts:

1. **Wireframe:** structure, information hierarchy, states, and interaction flow.
2. **High-fidelity mockup:** final visual direction, layout, typography, color, lighting, and controls.
3. **Motion/behavior spec:** animation, sound, timing, interruption, reduced-motion behavior, and QA states.

No surface enters implementation without all three, unless it is explicitly a temporary prototype.

## Design system foundations

- 2.5D layered companion composition
- Shared bot state vocabulary with bot-specific expression
- Common chat and voice controls
- Bot-specific palettes, lights, motion, sound, and typography accents
- Audio-reactive mouth and light equalizer
- Compact system banners for work and delegation
- Simple specialist panels connected to the companion
- Fast-mode graceful visual reduction
- Balanced-mode richer lighting and effects
- Reduced motion, mute, quiet hours, and focus states

## Required wireframes and mockups

### Core companion

- Ready idle state
- Listening state
- Thinking state
- Speaking state with mouth/light equalizer
- Interrupted state
- Proactive reaction
- Sleeping and quiet state
- Powered-up and powered-down state
- Broken, unavailable, and recovering states

### Common interaction

- Closed widget
- Expanded common chat
- Bot picker and bot switching
- Voice controls and microphone permission
- Transcript and interruption controls
- Memory prompt and “forget this” interaction
- Context status and Seeing Eye toggle

### Specialist panels

- Nova/Sterling assistant panel for calendar, reminders, and planning
- Rivit coding-agent panel
- Luma image-generation and image-editing panel
- Panel open/close, voice interaction, progress, completion, failure, and return-to-chat states

### Collaboration

- Specialist delegation cue
- Background work banner
- Completion, question, permission, and failure banners
- Expanded delegation details
- Stop/cancel delegated task

### Setup and control

- First-run welcome
- Hardware/profile detection
- Model download and progress
- Microphone and speaker test
- Context permission explanations
- Simple settings home
- Voice, companion, presence, memory, context, performance, and privacy settings
- Repair, update, unavailable, and reset flows

## Mockup review criteria

Every mockup is reviewed for:

- Can the user understand the current state without reading technical jargon?
- Does the bot feel alive without demanding attention?
- Is the primary voice interaction obvious?
- Is the user’s control over memory, context, and actions visible?
- Does each bot look and move like itself?
- Does the panel stay simple and task-focused?
- Does the surface work at Fast-mode visual quality?
- Can every important state be tested visually?

## Design QA

Approved mockups become visual QA references. Any implementation change affecting layout, artwork, animation, lighting, sound, typography, or native window geometry must be compared against the relevant reference states.

## Design sequence

1. Lock shared companion geometry and common chat.
2. Lock the shared liveness/state language.
3. Audit and improve the current bot artwork for V1 animation readiness.
4. Define bot-specific art and motion direction.
5. Design specialist panels.
6. Design onboarding, permissions, memory, and settings.
7. Produce high-fidelity mockups and motion specifications.
8. Build visual QA fixtures before implementation batches begin.

## Current visual status

The existing bot busts are provisional V1 assets. They are good enough to build and test the companion, animation states, voice visualization, panels, and QA fixtures. Do not spend the current implementation cycle polishing or redrawing them.

The visual redesign is deferred to a dedicated replacement pass when ImageGen is available. That pass will improve differentiation, expression, layering, voice visualization, and motion readiness while preserving the runtime contracts and asset slots established during V1 development.
