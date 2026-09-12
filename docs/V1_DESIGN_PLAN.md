# MyAvatar V1 design plan

## Design goal

V1 should feel like a living 2.5D companion that can also help with focused work. The design must make emotional presence, voice state, context use, specialist work, permissions, and recovery understandable without turning the interface into a dashboard.

## Design deliverables

Each major surface receives three artifacts:

1. **Wireframe:** structure, information hierarchy, states, and interaction flow.
2. **High-fidelity mockup:** final visual direction, layout, typography, color, lighting, and controls.
3. **Motion/behavior spec:** animation, sound, timing, interruption, reduced-motion behavior, and QA states.

The ten structural wireframes are complete in `docs/v1-wireframes/`. No new
surface enters final implementation without the other two artifacts, unless it
is explicitly marked as a temporary prototype. See
`V1_DESIGN_DELIVERABLES.md` for the tracking checklist.

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
- Primary toolbar Pause/Resume control plus compact More menu with Hide widget,
  Runtime health, and Quit MyAvatar
- Panel close versus widget hide versus full application quit

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

1. Lock shared 2.5D geometry, common chat, and visual tokens.
2. Lock the shared liveness/state and motion language.
3. Produce the shared companion high-fidelity references and QA fixtures.
4. Define bot-specific art, expression, voice visualization, and motion direction.
5. Produce specialist panel, context, memory, setup, settings, and recovery references.
6. Produce motion specifications for each approved surface.
7. Build visual QA fixtures before each implementation batch.

## Current visual status

The existing bot busts are provisional V1 assets. They are good enough to build and test the companion, animation states, voice visualization, panels, and QA fixtures. Do not spend the current implementation cycle polishing or redrawing them.

The visual redesign is a dedicated V1 design pass. ImageGen may accelerate asset
exploration, but it is not a prerequisite for defining the system or producing
QA references. Replacement art must preserve the runtime contracts and asset
slots established during V1 development.
