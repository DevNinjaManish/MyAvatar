# Architecture

Updated 2026-09-09. This document separates the implemented baseline from the proposed engine redesign in [ENGINE_IMPROVEMENT_PLAN.md](ENGINE_IMPROVEMENT_PLAN.md). Adding the plan does not implement it.

## Current implementation

Electron hosts a sandboxed renderer. Three.js/WebGL displays the included art-directed 2.5D robot portraits and busts with dynamic hardware effects. The frontend connects with a per-launch token to a Python WebSocket service bound to `127.0.0.1`. The supplied runtime needs no public listener, remote scripts or paid cloud inference API.

```text
electron/main.cjs                transparent widget, modes, layout IPC, screen/folder picker
electron/preload.cjs             narrow IPC bridge; no generic filesystem/shell API
electron/widget-layout.cjs       pure work-area/wing geometry and request validation
src/widget-entry.js             existing app, followed by widget styles and panel controller
src/widget/panel-model.js        pure disclosure state and local UI preferences
src/widget/panels.js             attached-panel UI, drafts, focus and folder display name
src/widget-cockpit.css           compact control base
src/widget-panels.css            attached stack and wider file/diff shell
src/widget-polish.css            presentation/accessibility refinements
src/avatar/Avatar.js             shared scene and portrait lifecycle
src/avatar/PortraitFace.js       artwork, speaker LEDs, camera shutters and persona motion
public/assets/bots/              original Rivet, Nova, Sterling, Pixel and Luma assets
src/audio/engine.js              capture, high-pass filter, resampling and playback analyser
src/audio/vad.js                 adaptive energy-based detector, pre-roll and turn endings
public/capture-worklet.js        microphone PCM extraction
src/conversation/state.js        IDLE / LISTENING / THINKING / SPEAKING
src/main.js                     existing UI, turn, microphone and speech orchestration
backend/stt/provider.py          MLX Whisper adapter
backend/tts/provider.py          persistent Kokoro ONNX engine
backend/llm/provider.py          Ollama content-streaming client
backend/conversation/chunks.py   sentence/clause-sized synthesis chunks
backend/app.py                  sessions, warm-up, greetings, history and narrow action tags
backend/memory.py               optional per-bot local JSON history
config.json                     current provider/bot/Fast-Balanced-High defaults
data/settings.json              ignored saved preferences
scripts/start.mjs               starts/stops local child services with per-launch token
```

### Voice path

Microphone -> AudioWorklet -> local turn detector or manual capture -> mono 16 kHz PCM -> local WebSocket -> MLX Whisper -> Ollama text stream -> bounded sentence queue -> Kokoro WAV -> Web Audio -> analyser amplitude -> robot mouth/speaker equaliser.

STT and TTS use separate single-thread executors. Generation and synthesis overlap with bounded queueing; model/engine reuse reduces repeated setup. Ordinary turns carry an increasing identifier, and obsolete ordinary-turn responses/decodes are discarded. Native inference may finish after coroutine cancellation; discarding its result is not the same as forcibly stopping it.

The renderer maintains capture, mute, generation and playback flags in addition to the four display states. It currently uses a timer to reopen capture during live generation/playback. This is not evidence of reliable speaker-safe full-duplex interruption. Capture cleanup, late timers, greeting freshness and reconnect handling are explicit review targets. Do not rely on older descriptions claiming the capture gate always stays closed until playback ends.

Greetings are authored in the backend and synthesised on connection/bot/settings changes. They have not yet been migrated to the planned cancellable scheduler. Engine liveness/readiness is not yet a unified runtime state. Settings are written to local files; optional conversation memory uses per-bot JSON. These are implementation facts, not guarantees against corrupt preferences or shutdown races.

### Widget and coding panels

Compact dimensions are 260 x 338; chat-only requests 260 x 570. Attached Tools and Chat+Tools states request additional height within the work area. A file/diff wing chooses available left/right space or an inline fallback. All views reuse one native window and the existing renderer/audio session. See [UI_COCKPIT_PLAN.md](UI_COCKPIT_PLAN.md).

The five coding panels are a UI shell. Task text remains an in-window draft; Discuss in chat protects an existing unsent message and does not submit automatically. The native folder picker returns a display name only, not an authorised root or execution token. No coding reads/edits, tests, Git executor, real task queue, delegation or live resource telemetry are connected.

The backend does contain limited approval-based Mac action tags. They are distinct from coding tools and need the reliability/approval fixes in the engine plan. In particular, their current existence must not be advertised as an implemented general agent framework.

### Appearance and locality

Keep original bot identities, transparent busts, one full companion, four primary cockpit controls and attached panels. Mouth equalisation stays inside each illustrated speaker grille and depends on actual speech output. Idle, listening and thinking must not activate the speech equaliser. Persona motion and optional emotion tags complement this signal; cockpit decoration does not replace it. Existing art choices are not a legal-clearance guarantee.

Opt-in screen awareness uses a narrow preload call and a downscaled display image. The frame is sent to the supplied loopback Ollama configuration and discarded after the turn. The backend disables action-tag handling for image-bearing turns and treats the image as untrusted. Only derived comments enter the separate local screen-awareness log. Future tools must preserve that boundary across screen text, code, logs and retrieved content.

Model downloads are explicit setup work. Normal diagnostics should remain local and avoid private content. The renderer sandbox does not sandbox an OS command launched by a privileged process; project scope/cwd is also not command containment. This distinction is mandatory for future execution features.

## Proposed engine architecture — not implemented

Implement a small shared runtime with independently modelled readiness, engines, microphone, playback and agent tasks. Introduce typed/versioned events and freshness identifiers. Keep providers behind narrow readiness/warm-up/request/cancel/dispose contracts. Voice, clicks and keys ultimately dispatch the same validated application commands.

Follow this order:

1. Configuration normalisation, regression harness and runtime state ownership.
2. Progressive readiness/recovery and a low-priority cancellable greeting scheduler.
3. Microphone ownership, reliable turn-taking and distinct speech Stop/task cancellation.
4. Validated voice profiles, speech-specific text, chunk continuity and bounded playback.
5. Canonical chat/message store with widget-visible approvals and explicit local memory.
6. Capability registry, bounded tool loop and low-risk UI operations; later scoped coding execution.
7. State-driven animation lifecycle, safe asset switching and measured resource budgets.

Start with one heavy model-generation workload at a time and one speaking session. Other bots contribute through scheduled handoffs and activity chips, not permanently loaded independent models. Keep Fast/Balanced as the target public interface; migrate the legacy High setting only when that code lands.

A future tool has a schema, scope, permission, timeout, output limit, cancellation and retry/idempotency policy. The model never grants its own authority. Approval and successful execution are separate outcomes. Reconnect must not automatically repeat side effects. Project-level read/search, protected edits, commands/tests, Git and checkpoint/resume are a separate milestone after the runtime is dependable.

## Integration and validation status

The maintainer explicitly requested PR #1 and the roadmap be integrated into `main` despite deferred native checks. That replaces the previous draft-only hold, not the release-validation requirements. Subsequent engine changes belong in focused branches from the integrated baseline.

GitHub Actions verified JavaScript tests, Python tests and the production build on the UI baseline `bc40c4f` ([run](https://github.com/DevNinjaManish/MyAvatar/actions/runs/34356589056)). Historical panel/polish fixture results and their mocking limitations are documented in the UI handoffs. Direct package/repository downloads in the documentation-editing environment were unavailable; no new local full-app run is claimed.

Native Mac audio/echo, permission paths, all five live portraits, window/monitor transitions, sleep/wake and actual performance remain deferred. The new runtime and engine work is planned, not validated by old UI tests. Complete applicable checks before release qualification; see the checklist in [ENGINE_IMPROVEMENT_PLAN.md](ENGINE_IMPROVEMENT_PLAN.md).
