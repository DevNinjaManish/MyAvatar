# MyAvatar V1 implementation backlog

This backlog is ordered by dependency and risk. Work proceeds in small vertical slices. Each item requires code tests, relevant visual QA, failure handling, and documentation updates.

## Phase 1: safe runtime foundation

1. Define shared typed event schemas and versioning.
2. Define model, voice, vision, context, image, and action provider interfaces.
3. Add hardware, memory, disk, and architecture detection.
4. Complete Fast/Balanced profile diagnostics and hardware qualification; runtime selection is implemented in the More menu.
5. Add provider health, fallback, cancellation, and timeout contracts.
6. Build deterministic fake providers for CI and native smoke tests.
7. Preserve and automate the existing MVP regression path.

## Phase 2: real-time voice and liveness

1. [x] Replace the single-turn voice path with an interruptible streaming turn manager.
2. [x] Add adaptive endpointing, reliable Stop cancellation, noise-safe reply playback, and contextual persona fallback. Acoustic barge-in remains opt-in pending semantic qualification.
3. [ ] Complete hybrid local TTS with authored nonverbal audio playback; local persona TTS is connected.
4. [x] Complete the core 2.5D state renderer and shared animation state machine; final replacement art remains a separate asset pass.
5. [x] Add audio-driven mouth and light equalizer.
6. [x] Complete ready, listening, understanding, speaking, working, paused, sleeping, error, and recovery production states.
7. [ ] Complete bot-specific voice fixtures and blind identity QA; four-bot visual state fixtures are complete.
8. [ ] Pass real-microphone English/Hindi/Hinglish, noisy-room, pause, Stop cancellation, and 20-turn soak qualification.

Use existing bot assets as provisional placeholders throughout this phase. Asset redesign is not a prerequisite for implementing or testing the runtime.

## Phase 3: memory and context

1. Add versioned local memory store and retrieval interfaces.
2. Implement working context, conversation, activity, factual, relationship, and bot memory layers.
3. Add inspect, correct, forget, clear, and retrieval-removal behavior.
4. Add time, weather, app, project, and workspace collectors.
5. Add Git, calendar, reminders, files, browser, and system collectors.
6. Add Seeing Eye permission, intermittent snapshots, provenance, and temporary frame handling.
7. Add context source health and graceful degradation.

## Phase 4: bot identities

1. Implement shared bot configuration schema.
2. Author Nova voice, emotional, memory, intimacy, and proactivity behavior.
3. Author Sterling voice, emotional, memory, and assistant behavior.
4. Author Rivit coding behavior and safe coding capability profile.
5. Author Luma creative behavior and image capability profile.
6. Add blind identity tests for text, voice, visuals, and decisions.

## Phase 5: panels and delegation

1. [x] Build shared local assistant panel for Nova and Sterling.
2. [x] Build Rivit coding-panel UI with explicit folder scope and prepared-plan boundary.
3. [x] Build Luma image-panel UI with Generate/Edit routing and local upload preview.
4. Add action broker and confirmation UI.
5. Add interruptible background job queue.
6. Add bounded bot delegation envelopes and routing.
7. Add specialist activity cues and system banners.

## Phase 6: qualification

1. Run clean-install setup on Intel and Apple Silicon.
2. Run Fast profile qualification on 8 GB hardware.
3. Run Balanced profile qualification on 16 GB preferred hardware.
4. Run voice, memory, context, delegation, sleep/wake, and restart soak tests.
5. Complete full visual QA and regression suite.
6. Fix critical issues and run a creator daily-use trial.
7. Decide private V1 versus public V1 release.

## Visual replacement pass

The first four-bot activity-state reference is complete at
`design-references/v1-companion-state-reference.png`. Complete Working,
Sleeping, and Recovery references, then produce production-ready layered assets.
Re-run visual QA and asset performance checks while preserving bot configuration,
animation state, voice visualization, and panel contracts.

## Completed first implementation slice

Shared event schemas, provider interfaces, hardware/profile detection, and the
existing regression path are implemented and green. Current execution priority
is the remaining Phase 2 human voice qualification above.
