# Roadmap

Updated 2026-09-09. This is a development plan, not a promise of dates or a claim that planned capabilities already work. Detailed design, dependencies, estimates and acceptance criteria: [ENGINE_IMPROVEMENT_PLAN.md](ENGINE_IMPROVEMENT_PLAN.md).

## Integration status

The maintainer requested integration of the accumulated cockpit, attached-panel and UI-polish work from PR #1 into `main`, together with the engine roadmap. Native Mac validation remains outstanding; integration does not qualify a release. Continue engine work in focused branches. Batch progress and limitations are recorded in [ENGINE_BATCH_LOG.md](ENGINE_BATCH_LOG.md).

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

- [~] Add typed runtime/engine events with session, bot, operation, turn and task identities. Batch 02 adds versioned session/bot/sequence envelopes and greeting operation IDs; Batch 03 adds client-side session/bot/sequence enforcement and engine-readiness payloads. Task identities and a fuller cross-engine event model remain.
- [~] Separate readiness, microphone, playback and task state; reject stale events. Batch 03 adds independent LLM/STT/TTS readiness and stale-event rejection; Batch 04 adds microphone capture ownership/generation; Batch 05 adds explicit turn/playback coordination. Task state remains future work.
- [~] Validate defaults/preferences: Batch 01 resolves selected profiles, validates saved choices and recovers malformed settings with atomic writes. Full provider/numeric validation and richer in-widget recovery remain.
- [ ] Migrate legacy High preferences to the agreed Fast/Balanced-only interface.
- [x] Fix approval-ID generation (`random.token_hex` -> `secrets.token_hex`) with regression coverage; revoke pending approvals on timeout/cancellation and reject invalid, duplicate and stale decisions.
- [~] Add bounded startup/recovery, component readiness and text-only degradation where possible. Batch 03 adds truthful per-engine readiness and degraded text/chat behavior; Batch 06 makes runtime TTS failure degrade to a completed text answer. Reconnect/backoff and explicit retry policy remain.
- [~] Make greetings cancellable, once-per-event, identity-safe and truthful; silence settings/reconnect greeting spam. Batch 02 implements cancellable authored greetings, settings silence, onboarding ordering and quick-reconnect cooldown; full reconnect policy remains.
- [~] Preserve explicit microphone and quiet-mode preferences through all transitions. Batch 04 keeps mute as a listening gate that does not end the live capture; broader reconnect/device preference handling remains.

## P1 — Listening and speech

- [~] Centralise MediaStream/worklet ownership and cleanup for end-session, failure, disconnect and device changes. Batch 04 adds single capture ownership, generation-based stale callback rejection, idempotent cleanup, pending-permission cancellation, disconnect and unload cleanup. Device-change recovery remains.
- [~] Replace timer-only listening reopen behaviour with explicit turn/playback coordination. Batch 05 makes turn/playback state authoritative so the legacy timer cannot reopen listening during an active reply; source-level timer cleanup remains a small follow-up.
- [~] Separate Stop speaking, mute, End conversation, Cancel task and Undo. Batches 04–05 separate Stop speaking, Mute and End conversation and make Stop cancel current playback/turn without releasing live capture. Cancel task and Undo remain future agent work.
- [ ] Build repeatable noise, pause, short-command, accent and technical-vocabulary fixtures.
- [ ] Benchmark optional speech-aware VAD before changing the default detector.
- [ ] Introduce recognition-provider contracts; evaluate Intel compatibility and multilingual support separately.
- [ ] Add validated per-bot voice/language profiles; select final voices through listening tests.
- [~] Separate spoken summaries from detailed display content; normalise markup and technical pronunciation. Batch 06 adds a TTS-only normaliser for markdown, code blocks, links, paths and an initial technical pronunciation map. Final voice/listening review remains.
- [~] Improve chunk continuity, bounded queues, stale-audio discard and recoverable TTS failure. Batch 05 rejects stale playback; Batch 06 prefers sentence/clause chunks, bounds the synthesis queue, and degrades TTS runtime failure to text-only completion. Live quality tuning remains.

## P2 — Chat and controlled agent behaviour

- [~] One canonical conversation store for compact/expanded views with stable message status and IDs. Batch 07 adds the shared store, stable per-turn IDs, and explicit streaming/complete/interrupted/failed states; migration of interactive approvals/tool cards remains.
- [~] Preserve per-bot drafts and reader scroll position; add safe copy/retry/replay/transcript correction. Batch 07 isolates drafts by companion and preserves reader position instead of forcing scroll-to-bottom. Retry/replay/transcript correction remain.
- [~] Show requests, approvals, tool results and failures inside the widget. Batch 07 adds typed structured-message foundations and message failure/voice-warning state, while existing interactive approval cards intentionally remain on the current path until they can be migrated without losing controls.
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

Real microphone/speaker echo and interruption, OS permissions, all five live bots, native window/monitor behaviour, voice selection and hardware performance remain deferred until the maintainer is ready. Pure logic, fixtures and isolated UI work need not wait. Track the detailed checklist in [ENGINE_IMPROVEMENT_PLAN.md](ENGINE_IMPROVEMENT_PLAN.md).

Before release qualification, rerun complete tests/build and finish applicable native checks. Prior automated or mocked results do not certify live audio or native appearance.

## Later extension work

Validated custom-companion manifests, contributor examples, richer local memory controls and optional menu-bar convenience actions remain future work after the core runtime is dependable.

## Explicitly out of scope for now

Cloud inference/sync/accounts, remote analytics, local video generation, full-body/3D character replacement, pinning, marketplaces, mobile clients, Windows/Linux product ports and a large multi-service agent framework. Local diagnostic metrics are in scope. Alternative models/providers require evidence, not an automatic upgrade.
