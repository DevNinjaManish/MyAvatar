# Roadmap

Updated 2026-09-09. This is a development plan, not a promise of dates or a claim that planned capabilities already work. Detailed design, dependencies, estimates and acceptance criteria: [ENGINE_IMPROVEMENT_PLAN.md](ENGINE_IMPROVEMENT_PLAN.md).

## Integration status

The maintainer requested integration of the accumulated cockpit, attached-panel and UI-polish work from PR #1 into `main`, together with the engine roadmap. This supersedes the earlier draft-only hold. Native Mac validation remains outstanding; integration does not qualify a release. Continue later work in focused branches from the integrated baseline.

## Implemented baseline

- [x] Local loopback service, per-launch token, sandboxed renderer and no paid runtime API.
- [x] Original Rivet, Nova, Sterling, Pixel and Luma artwork and personalities.
- [x] Existing MLX Whisper/Ollama/Kokoro conversation and mouth-speaker equaliser path.
- [x] Source-run launcher, onboarding, saved selections and optional local conversation memory.
- [x] Widget-first cockpit with Mic, Chat, Tools, More and separate contextual speech Stop.
- [x] Attached Task, Files/Changes, Terminal, Tests and Git/Diff UI panels; wide-view layout and simultaneous Chat+Tools.
- [x] Panel keyboard navigation, draft protection, honest empty states and display-name-only folder picker.

The coding panels are a UI shell, not an executor. Existing narrow Mac action tags do not constitute a reliable general agent framework. Fast/Balanced/High remain in current code; the two-mode migration below is not implemented yet.

## P0 — Shared runtime and trustworthy startup

Batch progress, scope and test limitations: [ENGINE_BATCH_LOG.md](ENGINE_BATCH_LOG.md).

- [ ] Add typed runtime/engine events with session, bot, operation, turn and task identities.
- [ ] Separate readiness, microphone, playback and task state; reject stale events.
- [~] Validate defaults/preferences: Batch 01 resolves selected profiles, validates saved choices and recovers malformed settings with atomic writes. Full provider/numeric configuration validation and in-widget recovery messages remain.
- [ ] Migrate legacy High preferences to the agreed Fast/Balanced-only interface.
- [x] Fix approval-ID generation (`random.token_hex` -> `secrets.token_hex`) with regression coverage; revoke pending approvals on timeout/cancellation and reject invalid, duplicate and stale decisions.
- [ ] Add bounded startup/recovery, component readiness and text-only degradation where possible.
- [ ] Make greetings cancellable, once-per-event, identity-safe and truthful; silence settings/reconnect greeting spam.
- [ ] Preserve explicit microphone and quiet-mode preferences through all transitions.

## P1 — Listening and speech

- [ ] Centralise MediaStream/worklet ownership and cleanup for end-session, failure, disconnect and device changes.
- [ ] Replace timer-only listening reopen behaviour with explicit turn/playback coordination.
- [ ] Separate Stop speaking, mute, End conversation, Cancel task and Undo.
- [ ] Build repeatable noise, pause, short-command, accent and technical-vocabulary fixtures.
- [ ] Benchmark optional speech-aware VAD before changing the default detector.
- [ ] Introduce recognition-provider contracts; evaluate Intel compatibility and multilingual support separately.
- [ ] Add validated per-bot voice/language profiles; select final voices through listening tests.
- [ ] Separate spoken summaries from detailed display content; normalise markup and technical pronunciation.
- [ ] Improve chunk continuity, bounded queues, stale-audio discard and recoverable TTS failure.

## P2 — Chat and controlled agent behaviour

- [ ] One canonical conversation store for compact/expanded views with stable message status and IDs.
- [ ] Preserve per-bot drafts and reader scroll position; add safe copy/retry/replay/transcript correction.
- [ ] Show requests, approvals, tool results and failures inside the widget.
- [ ] Add safe code formatting and explicit, bounded local memory controls.
- [ ] Add a structured capability registry and shared voice/click/keyboard command path.
- [ ] Validate tools and permissions outside the model; no authority from rendered prose or screen/repository text.
- [ ] Bound task steps, retries and deadlines; never replay side effects automatically on reconnect.
- [ ] Start with real low-risk UI actions; schedule specialist handoffs without extra full bots or permanently loaded models.
- [ ] Make proactivity opt-in, event-driven, rate-limited and based on actual outcomes.

## P3 — Animation lifecycle and measured performance

- [ ] Coordinate animation with real readiness/playback/listening/task state.
- [ ] Keep mouth equalisation inside original speaker hardware and tied to actual output audio.
- [ ] Validate selected-bot assets before switching; discard obsolete loads and recover failures.
- [ ] Add resource disposal, deterministic animation fixtures and reduced-motion coverage.
- [ ] Profile idle/hidden rendering and engine queues before claiming FPS or latency improvements.
- [ ] Record cold/warm and median/slow-case local metrics without default private-content logging.

## P4 — Separate coding-execution milestone

- [ ] Authorised project scope, bounded list/search/read and Git inspection.
- [ ] Protected task working copies/branches that preserve pre-existing edits.
- [ ] Permissioned command recipes, output/time limits and real cancellation.
- [ ] Verified edits, actual test results, reviewable diffs and narrowly defined undo.
- [ ] Inspectable task checkpoints and explicit resume; no automatic side-effect replay.
- [ ] Validate execution containment before claiming arbitrary scripts are sandboxed.

## Deferred native/release checks

Real microphone/speaker echo and interruption, OS permissions, all five live bots, native window/monitor behaviour, voice selection and hardware performance remain deferred until the maintainer is ready. Pure logic, fixtures and isolated UI work need not wait. Track the checklist in [ENGINE_IMPROVEMENT_PLAN.md](ENGINE_IMPROVEMENT_PLAN.md).

Before release qualification, rerun complete tests/build and finish applicable native checks. Prior automated or mocked results do not certify live audio or native appearance.

## Later extension work

Validated custom-companion manifests, contributor examples, richer local memory controls and optional menu-bar convenience actions remain future work after the core runtime is dependable.

## Explicitly out of scope for now

Cloud inference/sync/accounts, remote analytics, local video generation, full-body/3D character replacement, pinning, marketplaces, mobile clients, Windows/Linux product ports and a large multi-service agent framework. Local diagnostic metrics are in scope. Alternative models/providers require evidence, not an automatic upgrade.
