# MyAvatar V1 QA strategy

## Goal

V1 development must remain incremental. Every feature batch should be independently testable, reversible, and unable to silently break the core MVP journey.

## Non-negotiable regression path

The following path must remain green after every batch:

1. Launch one widget
2. Runtime becomes Ready or honestly Unavailable
3. Select a bot
4. Open common chat
5. Start typed or voice interaction
6. Receive a readable response
7. Interrupt or stop the response
8. Close and reopen the panel
9. Recover from runtime or voice failure
10. Quit and relaunch without duplicate processes or stale state

## Test layers

### Contract tests

Test shared event contracts, bot configuration, memory operations, permissions, capability routing, model adapters, voice states, delegation envelopes, and background-job lifecycle.

### Unit tests

Test state machines and pure logic in isolation: turn-taking, interruption, memory ranking, context filtering, action policy, performance selection, and proactivity cooldowns.

### Integration tests

Test the local orchestrator with fake model, voice, context, and action providers. Use deterministic fixtures so failures are reproducible without requiring a live model or microphone.

### Native smoke tests

Run the packaged Electron app for launch, window geometry, permissions, keyboard/mouse interaction, voice controls, specialist panels, banners, shutdown, and relaunch.

### Visual regression tests

Capture approved states for the widget, chat, banners, bot panels, onboarding, settings, memory, context permissions, listening, speaking, thinking, delegation, recovery, and powered-down animations. Review changes whenever layout, art, lighting, sound, typography, or animation code changes. Approved wireframes and mockups are the source of truth for visual comparison.

### Performance tests

Measure Fast and Balanced profiles on representative Intel and Apple Silicon Macs, including 8 GB, 16 GB, and complete 20 GB model-bundle configurations where available. Track startup, model load, time to first audio, interruption latency, memory use, CPU/GPU load, disk use, and thermal behavior.

Also test first-run setup, interrupted downloads, repair, upgrades, model replacement, permission changes, and migration from the MVP data/state format.

### Soak and daily-use tests

Run long conversations, repeated bot switching, background jobs, screen-context sessions, memory growth, sleep/wake, runtime restarts, and many consecutive voice turns. V1 quality depends on repeated use, not only clean single-turn demos.

## Batch development rules

- Implement one vertical slice at a time.
- Keep new capabilities behind explicit feature flags until their acceptance path is green.
- Preserve a known-good MVP smoke script.
- Use fake providers for deterministic CI and real providers for scheduled qualification.
- Never make a model, voice engine, or context source a requirement for the common chat path unless the feature explicitly needs it.
- Add tests in the same batch as the feature.
- Do not combine runtime, visual, memory, and capability migrations in one unreviewable change.
- Keep data migrations backward-compatible and recoverable.
- Capture a short manual QA note for every native or visual change.

## Release checkpoints

Each V1 milestone must pass:

- Automated tests
- Build and packaging
- Core MVP regression path
- Relevant visual states
- Relevant failure and recovery states
- Fast-profile performance check
- Documentation and acceptance updates

## Safe rollout

New proactive behavior, context sources, actions, and model adapters begin disabled or limited. They become default only after observation in real daily use. A feature can be rolled back independently without removing the working companion, memory, or chat system.
