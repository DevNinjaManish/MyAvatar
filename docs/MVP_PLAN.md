# MyAvatar MVP Plan

This document tracks the implementation milestones for the MyAvatar MVP. The detailed product definition lives in [`docs/mvp/`](mvp/); this file is the execution roadmap.

## MVP outcome

On a clean supported Mac, a user can launch the compact widget, choose a companion, type or speak a request, receive a readable and spoken local response, stop an in-progress response, recover from unavailable audio or runtime services, and relaunch without getting stuck.

## Working rules

- Build in small vertical slices that can be run and checked end to end.
- Treat [`docs/mvp/SCOPE.md`](mvp/SCOPE.md) as the boundary for MVP feature work.
- Use the wireframes and [design reference](mvp/design/DESIGN_REFERENCE.md) before implementing or restyling a surface.
- Run the native [visual QA workflow](mvp/VISUAL_QA.md) after every UI or layout change.
- Treat visual QA as mandatory after every UI-affecting run, including small CSS or native-window changes.
- Keep typed chat usable whenever voice or local runtime capabilities are unavailable.
- Update this plan as milestones move; record important technical choices separately when needed.

## Milestones

### 0. Foundation and product contract

Status: Complete

Deliverables:

- Product brief, MVP scope, wireframes, design reference, technical foundation, and acceptance checklist.
- Existing Electron/frontend structure and automated JavaScript tests understood.

Exit criteria:

- The team can identify the primary user journey and what is explicitly out of scope.
- New work can be tied to a documented requirement and acceptance item.

References: [`docs/mvp/README.md`](mvp/README.md), [`docs/mvp/PRODUCT_BRIEF.md`](mvp/PRODUCT_BRIEF.md), [`docs/mvp/SCOPE.md`](mvp/SCOPE.md).

### 1. Functional shell and ready state

Status: Complete

Verification: 2026-09-12 — Native smoke QA launched the Electron widget, confirmed one active widget process/window after a clean relaunch, opened and used the companion picker, and confirmed companion identity/artwork updates. Visual QA captured the closed Ready state, the full status banner below the platform, and the expanded chat state with platform controls, chat border, input, and Send button all contained and visible. The chat panel opens with a focused message field. The single-instance lock and IPC drag/resize paths were also rechecked in code; automated build, tests, and runtime integration pass.

Deliverables:

- One compact, draggable Electron widget.
- Reliable launch, startup, ready, unavailable, retry, close, and relaunch behavior.
- Companion picker with synchronized name, artwork, accent, and identity.

Exit criteria:

- `npm start` opens exactly one usable widget.
- The widget can be moved, closed, relaunched, and recovered without duplicate windows or stale resources.
- Companion selection works with mouse and keyboard.

### 2. Typed conversation vertical slice

Status: Complete

Deliverables:

- Open/close chat interaction.
- Focused text input and send flow.
- Readable assistant response rendering.
- Loading, success, error, stop, clear, and transcript behavior.

Verification: 2026-09-12 — Added the authenticated loopback conversation service, Ollama streaming, typed turn transport, Stop, Clear, retry, unavailable/error states, and native-sized chat layout. Browser-level end-to-end verification opened chat, sent a real prompt, received the streamed response `Yes`, and cleared the transcript; build, runtime integration, and all automated tests pass.

Exit criteria:

- A user can launch, choose a companion, send a typed message, read the response, stop an active response, and recover from a failed request.
- Automated state and UI tests cover the core path.

### 3. Local runtime and recovery

Status: Complete

Deliverables:

- Per-launch authenticated local connection.
- Supported local model configuration and setup documentation.
- Bounded reconnect and truthful unavailable states.

Verification: 2026-09-12 — Runtime starts with the app, authenticates loopback sessions, reports Starting/Connecting/Ready/Unavailable states, retries up to three times with backoff, prevents duplicate sockets, and exposes a manual Retry action. Failure-path browser QA killed the runtime, observed the Unavailable state and Retry button, restarted the service, and recovered to Ready. Runtime integration returned a streamed Ollama response.

Exit criteria:

- Backend/model unavailable states are clear and retryable.
- Retry cannot create duplicate sockets or duplicate turns.
- Typed chat remains usable when the runtime is unavailable, where supported by the product contract.

### 4. Voice conversation

Status: Complete

Deliverables:

- Explicit microphone permission flow.
- Distinct listening, thinking, speaking, stopped, and failure states.
- Local transcription submission and local speech output.
- Voice failure fallback to typed chat.

Verification: 2026-09-12 — Connected the explicit microphone flow to local `MediaRecorder`, OpenAI Whisper CLI (`tiny` model) transcription, the existing typed conversation path, and local macOS `say` plus WAV playback. Native QA confirmed the Mic control transitions to Listening and Stop, while the voice integration test generated a real audio fixture and verified transcript, streamed response, and speech audio payload end to end. Failure states preserve typed chat. The banner geometry was also corrected so warning copy receives reserved bottom space.

Exit criteria:

- A user can complete one voice turn end to end and see the response as text and hear it spoken.
- Permission denial, recognition failure, speech-output failure, and stop all return to a truthful usable state.

### 5. Quality gate and MVP release candidate

Status: Complete

Deliverables:

- Automated tests passing.
- Production build passing.
- Native smoke QA on supported Mac hardware.
- Known limitations and setup requirements documented.

Exit criteria:

- Every item in [`docs/mvp/ACCEPTANCE.md`](mvp/ACCEPTANCE.md) is checked or has an explicitly documented limitation.
- The primary launch → companion → conversation → recovery → relaunch journey works on a clean setup.
- No out-of-scope surface is reachable from the MVP shell.

Verification: 2026-09-12 — The acceptance checklist is checked against the clean-install build, automated tests, runtime and voice integration tests, native launch/relaunch, companion, keyboard, typed-chat, recovery, banner, and expanded-chat QA. The only non-blocking release note is Vite’s bundle-size warning; voice setup requires the local Whisper CLI and macOS `say`.

## Current next step

MVP is wrapped. Future work belongs to the V1 backlog: bundle or automate Whisper setup, reduce the Vite bundle warning, and expand voice quality testing.

## Change log

- 2026-09-12: Added the milestone roadmap and linked it to the existing MVP planning documents.
- 2026-09-12: Verified the native launch, compact widget, accessible controls, and companion picker.
- 2026-09-12: Verified the native chat panel opens and focuses its message field; typed submission remains a documented placeholder for Milestone 2.
- 2026-09-12: Fixed chat-open companion framing so the avatar remains visible when the chat panel is displayed.
- 2026-09-12: Decoupled chat positioning from the avatar stage and constrained the chat overlay to the fixed widget bounds; the companion no longer moves or resizes when chat opens.
- 2026-09-12: Aligned chat behavior with the design reference: native window grows from 470px to 620px while open, then restores on close; the full conversation panel is preserved.
- 2026-09-12: Removed the opaque root page background that was covering Electron transparency; the widget now renders as floating avatar/card surfaces over the desktop.
- 2026-09-12: Started Milestone 2 with ChatStore-backed typed message rendering, unavailable-runtime errors, and Stop control wiring.
- 2026-09-12: Completed Milestone 2 with the local authenticated WebSocket/Ollama service, streamed typed responses, Clear, retry, Stop, and integration verification.
- 2026-09-12: Completed Milestone 3 with bounded runtime reconnect, readiness states, stale-socket protection, and manual Retry handling.
- 2026-09-12: Verified runtime disconnect, unavailable UI, manual Retry, and recovery to Ready in the browser; kept the widget alive when the service child exits.
- 2026-09-12: Completed and checkpointed Milestone 1 with native launch, picker, banner, expanded-chat visual QA, clean relaunch, and automated verification.
- 2026-09-12: Increased the closed native shell to 500px so status-banner copy has a deliberate bottom safety margin; added ellipsis protection for long fallback messages.
- 2026-09-12: Completed Milestone 4 with local Whisper STT, macOS `say`/WAV TTS, explicit microphone interaction, voice integration testing, and typed-chat fallback.
- 2026-09-12: Wrapped the MVP with optional-voice setup diagnostics, actionable Whisper fallback messaging, final acceptance QA, and clean-install verification.
