# MyAvatar V1 decisions

This is the working decision record for V1 planning. It captures product direction agreed during planning and keeps unresolved questions visible until they are deliberately answered.

## Decided direction

### Primary audience

V1 is built for the creator first, then broadened toward both casual users and power users. The first quality bar is daily personal use, not maximum market coverage.

### Product posture

MyAvatar remains local-first for V1. Privacy, ownership of personal data, and dependable operation on the user's Mac are part of the product experience rather than implementation details.

### Companion model

V1 is an alive companion experience covering the full range of useful interaction: companion, colleague, friend, or employee depending on the bot and the user's intent. A companion has continuity, recognizable personality, voice, habits, feelings, moods, and behavior over time. It should invite interaction without becoming annoying.

The companion may use available local context—what the user is doing, their projects, goals, mood, status, computer state, weather, and time—to become more personal and useful. Context awareness must remain visible, permissioned, and controllable.

### Bot framework

Each bot has a distinct persona, voice, behavior, and intended usage. Bots share a common underlying framework for identity, memory, conversation, capabilities, safety, and presentation. Specializations are layered on top of that shared framework.

### Customization

Customization is part of V1, but it does not erase bot identity. Users should be able to shape selected aspects of a companion while each bot retains authored boundaries and a recognizable character.

### Success bar

V1 should support daily use, create genuine emotional attachment, and be strong enough to function as a showcase. A broad public release is optional and quality-gated; it may move to V2 if V1 is not yet reliable or emotionally convincing enough.

### Voice and performance

V1 is voice-first. Real-time voice interaction should remain alive and responsive, while longer work runs asynchronously in the background. The system must avoid getting stuck in a long-running operation or making the user wait silently.

V1 supports two performance profiles:

- **Fast:** optimized for low latency and MacBook Air-class hardware.
- **Balanced:** higher-quality or more capable local processing when the machine can support it.

All major operations should have a voice-friendly path and clear spoken or audible progress states.

### Memory

The companion may remember everything the local system can responsibly capture for the relationship, including facts, preferences, projects, routines, moods, events, and shared history. Memory must be inspectable and selectively removable so the user can ask the companion to forget something.

### Emotional expression

Emotional expression is bot-specific. Bots may express feelings, moods, preferences, affection, disappointment, disagreement, and other states when consistent with their authored persona and the user's intended relationship.

Nova's flirtation is intentionally able to push the edge, but it is adaptive and user-controlled. She may lightly test for increased intimacy based on reciprocal interaction, then adjust automatically. Escalation must remain reversible, respond to uncertainty by backing off, and never use emotional pressure or punish disengagement. V1 provides direct controls and natural voice commands to reduce, stop, or reset her tone.

### Context and proactivity

The Seeing Eye is the single visible global toggle for screen awareness. Other context sources—including projects, workspaces, calendars, reminders, Git repositories, weather, time, and system context—are granted according to bot specialization and user permission.

The companion may react continuously and initiate occasionally, including while the user works or when the companion has an authored reason to seek interaction. Proactivity remains subject to quiet hours, focus state, recent dismissal, and user pause or mute controls.

V1 supports the full planned context surface. Screen awareness is intermittent while the Seeing Eye is enabled; it is not intended to be an invisible permanent recording of everything the user does.

### Visual medium

V1 uses 2D animated companions. The shared framework provides layered animation, audio-reactive voice visualization, lighting, effects, and performance adaptation; each bot provides its own art direction and expression language.

### Voice performance

V1 voice is a live performance system. Each bot has a unique voice bible, natural turn-taking, interruption, pacing, emotional delivery, and authored nonverbal vocalizations such as laughter, sighs, breaths, surprise, humming, yawns, and occasional coughs or throat-clears.

The voice implementation is hybrid: local real-time TTS handles words, while authored local vocal assets and effects handle nonverbal performance and character texture.

### Specialist surfaces

V1 remains companion-first, but includes simple specialist windows. The shared widget is the emotional home; lightweight bot-specific panels open when a task benefits from a clearer practical surface. These are focused task panels, not full applications or dashboards.

- Nova and Sterling share an assistant workspace for calendar, reminders, lightweight planning, and everyday tasks.
- Rivit has a simple coding-agent panel for project context, Git, files, commands, and coding help.
- Luma has a simple image-generation and image-editing panel.
- Pixel and Ledger specialist panels are deferred until those bots enter the active V1 scope.

Every specialist panel remains connected to the companion: the bot can speak, react, explain what it is doing, and return the user to the relationship widget without losing context.

### Bot collaboration

V1 supports bounded bot-to-bot delegation. One bot remains primary for the user relationship and final response, while specialist bots can receive scoped tasks, work asynchronously, and return results. Delegation is visible, interruptible, permissioned, and protected against loops.

Delegation is silent by default. Visual specialist cues and compact system banners communicate meaningful starts, completions, questions, failures, and permission requests. Audible bot-to-bot conversation is deferred.

### Actions and trust

Bots use tiered permissions. Observation and preparation are the default; low-risk local actions can become trusted; consequential actions require confirmation unless the user explicitly grants a narrower standing permission.

### Installation and onboarding

V1 must be easy to install and configure for complete beginners. Setup should automatically detect hardware, install or download supported local dependencies where permitted, choose a sensible Fast or Balanced profile, verify voice, and explain any required permissions in plain language.

Setup requires no Terminal, manual model paths, or technical troubleshooting for the normal path. Settings remain grouped into a small set of plain-language categories, with advanced runtime controls hidden unless needed.

### Models and hardware

V1 supports Apple Silicon and Intel Macs. It prioritizes small local models and a manageable first-run download. Fast mode is optimized for slower hardware; Balanced mode adds reasoning depth and context without accepting an unresponsive conversation. Natural filler may acknowledge real extended thinking or checking, but must never hide a stalled system or fake progress.

The initial setup target is under approximately 10 GB. V1 supports 8 GB Macs as a minimum, with 16 GB preferred. The Fast model should remain warm for voice where possible, and responsiveness wins over depth when resources are constrained.

The model layer is provider-agnostic. Ollama may be the first adapter, but the bot framework, memory, UI, and capabilities must support swapping model runtimes later.

### Rivit scope

Rivit remains a simple coding agent in V1: project and Git understanding, file inspection, explanations, suggested changes, prepared patches or commands, and narrowly approved safe checks. Destructive or unrestricted autonomous terminal work is deferred.

### Release and distribution

V1 is quality-gated for personal daily use and showcase readiness. Public release is optional and may wait for V2.

### Quality and regression

V1 is built in small vertical slices with contract, unit, integration, native smoke, visual regression, performance, and soak testing. The MVP launch-to-conversation-to-recovery-to-relaunch path must remain green after every batch. New capabilities begin behind flags or limited defaults until they pass their acceptance and recovery checks.

## Product implications

- Memory and relationship continuity are core architecture, not an add-on.
- “Alive” needs explicit interaction rules: initiative, timing, presence, interruption, and quiet periods.
- Every bot needs a written character contract, not only a system prompt.
- Local runtime quality, latency, voice naturalness, and data controls become V1-critical.
- The compact widget remains the home of the relationship; new surfaces must earn their place.
- V1 acceptance must measure repeated-use quality, not only whether a single conversation works.

## Open decisions

- What activity history, if any, should be retained beyond the current interaction, for how long, and with what visible controls?
- What does “everything” mean operationally for relationship memory, how is it ranked, and how can the user inspect, correct, export, or delete it?
- Which parts of appearance, voice, persona, and behavior are customizable?
- What capabilities and specializations belong in V1?
- What is the local model/runtime strategy and supported hardware baseline?
- What data is stored locally, where, and how is it protected or deleted?
- What is the minimum quality bar for calling V1 complete, even if public release waits for V2?
- What latency, interruption, speech quality, and background-work targets define Fast and Balanced?

### Resolved recommendations

- Retain summarized, visible, meaningful activity history—not raw screenshots or a permanent all-action log.
- Let users promote selected activity into relationship memory and remove it later.
- Give Nova an adjustable intimacy spectrum that can be provocative for users who want that, while remaining explicit, reversible, and consent-aware.
