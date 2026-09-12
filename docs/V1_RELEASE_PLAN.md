# MyAvatar V1 release plan

## Phase 0: planning and contracts

Deliverables:

- Product brief, scope, journeys, bot contracts, memory model, architecture, liveness, voice, onboarding, actions, collaboration, and QA documents
- Shared event and provider contracts
- Acceptance matrix and test fixtures

Exit: the product and technical documents agree, and every V1 feature has an owner, failure state, and QA path.

## Phase 1: safe runtime foundation

Build:

- Provider abstraction
- Hardware/profile detection
- Automatic setup and repair
- Orchestrator lifecycle
- Common event model
- Fast/Balanced selection
- MVP regression harness

Exit: existing MVP behavior remains green on Intel and Apple Silicon test machines.

## Phase 2: voice and liveness

Build:

- Streaming voice loop
- Barge-in and cancellation
- Hybrid TTS and nonverbal audio
- 2.5D layered animation
- Mouth/light equalizer
- Listening, thinking, speaking, sleeping, powered, broken, and recovery states

Exit: repeated voice conversations feel responsive and every visual state passes QA.

## Phase 3: relationship and context

Build:

- Memory layers and controls
- Activity history
- Time, weather, app, project, workspace, Git, calendar, reminders, files, browser, system, and Seeing Eye collectors
- Permission and provenance UI

Exit: context improves usefulness, memory can be inspected and forgotten, and denied sources degrade safely.

## Phase 4: bot identities

Build:

- Nova, Sterling, Rivit, and Luma character contracts
- Unique voices and nonverbal assets
- Emotional and proactivity behavior
- Bot-specific context and capability profiles

Exit: bots are distinguishable in blind voice, visual, and conversation tests.

## Phase 5: specialist panels and delegation

Build:

- Nova/Sterling assistant panel
- Rivit simple coding panel
- Luma image panel
- Background job queue
- Bot delegation
- Visual collaboration cues and system banners

Exit: panels remain simple, voice-friendly, interruptible, and connected to the primary relationship.

## Phase 6: personal beta qualification

Run:

- Daily-use and soak testing
- Intel and Apple Silicon qualification
- 8 GB core-path, 16 GB Balanced-path, and 20 GB complete-bundle testing
- Setup, repair, upgrade, migration, and rollback testing
- Performance, thermal, voice quality, and model comparison
- Full code and visual QA

Exit: creator uses MyAvatar daily, the experience is showcase-quality, and no critical regression remains.

## Release decision

V1 can remain private/personal if quality is not ready for public distribution. Public release requires a separate decision after qualification; it is not an automatic consequence of completing the V1 feature set.
