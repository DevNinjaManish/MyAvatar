# Engine implementation batches

The approved target design is [ENGINE_IMPROVEMENT_PLAN.md](ENGINE_IMPROVEMENT_PLAN.md).
Keep changes small and independently reviewable. Native Mac validation remains
deferred; automated or mocked checks do not certify live microphone, speakers or
native appearance.

## Batch 01 - Configuration and existing action approvals

Base: `edd0f283baf39ea2e60e27582ad57e569ebc48b7`.
Branch: `engine/batch-01-config-approvals`.
Status: implemented with automated tests; this is only the first slice of P0.

### Implemented

- `backend/settings.py` owns local preference loading, allowlisted saved choices,
  and deterministic default/profile/bot resolution. A clean installation applies
  the declared profile, rather than displaying Balanced while using the raw
  unprofiled LLM defaults.
- Profile switches rebase on repository defaults. Going from High to Fast no
  longer inherits the previous profile's TTS speed. Existing profiles and voice
  identities are retained; this is not the two-mode migration or a model upgrade.
- Missing preferences use configured defaults. Malformed, oversized, unreadable,
  non-object or unsupported-schema preferences recover without deleting or
  rewriting the original file on read. Recovery chooses manual microphone mode
  and disables saved memory so losing preferences does not enable either one.
- Saved IDs, booleans and greeting indices are type-checked. Unknown provider,
  prompt and model overrides in settings are not applied. Legacy versionless
  settings remain readable; subsequent successful saves use schema version 1.
- Saves use a private same-directory temporary file, flush/fsync, then atomic
  replacement. A failed write retains the previous file and current in-memory
  session. Warnings are redacted local logs.
- `backend/approvals.py` repairs the existing `random.token_hex` defect using
  `secrets.token_hex`. Only an exact live request can be allowed once or denied.
  Invalid/forged IDs, duplicate decisions and late approvals are ignored.
  Timeout, cancellation and notification failure remove pending approval state.
- `backend/app.py` delegates to these modules. The existing narrow Mac action
  parser, result reporting and image-origin action rejection remain in place.
  This does not add a coding executor or authorize any new action.

### Validation performed for this batch

- 37 new tests in `tests/test_settings.py` and `tests/test_approvals.py`.
- 54 Python tests passed locally, including the unchanged existing server/chunk
  tests. In-process WebSocket tests mock model output, synthesis and Mac actions.
- Python compile checks passed. Exact-head GitHub Actions also passed JavaScript,
  Python and production-build checks for commit `8a270cf24f63e3e25800846a4af044bc7f2ecd9d`.
- Replayed the original approval-ID failure and corrupt-settings failure; both
  pass after the fix.

### Not implemented or certified by this batch

Full runtime/readiness state, greeting coordination, two-mode migration,
voice/listening improvements, chat-store work, animation changes and coding
execution remain planned. No live microphone, speaker or Mac action was tested.

## Batch 02 - Runtime identity and safe greeting lifecycle

Base: Batch 01 commit `8a270cf24f63e3e25800846a4af044bc7f2ecd9d`.
Branch: `engine/batch-02-runtime-greetings`.
Status: implemented and exact-head CI passed; stacked on Batch 01.

### Implemented

- `backend/runtime.py` adds a versioned server-event envelope. Every integrated
  WebSocket event carries one session ID, monotonic sequence, current bot ID and
  optional turn/operation identity.
- `backend/greetings.py` moves authored greeting selection and TTS scheduling out
  of the WebSocket handler. Greetings are low-priority tasks with an operation ID.
  Cancellation invalidates late synthesis results even when the native TTS worker
  cannot be force-stopped.
- User turns, Stop, bot changes, settings changes, clear and onboarding cancel a
  pending greeting before proceeding. Rapid bot switches therefore discard
  obsolete synthesis and only the latest selected bot may deliver a new greeting.
- Settings changes are deliberately silent. They no longer trigger another
  welcome line after changing performance or memory options.
- First-run connection no longer speaks before onboarding. Onboarding schedules
  the selected bot's first greeting after config/history update. Normal launch
  greeting is requested only after that bot has previously delivered a greeting.
- A process-local startup cooldown suppresses quick reconnect/reopen greeting
  repeats. This is not a complete reconnect manager.
- Greeting templates were rewritten to avoid unsupported claims such as a
  prepared schedule, agenda, diagnostics or completed work.
- Greeting failures are nonfatal and do not block the WebSocket receive loop.
  Rotation indices advance only after the greeting event is actually sent.

### Validation scope

Pure runtime, greeting and WebSocket integration tests cover event sequencing,
identity, cancellation, truthful templates and rapid bot switching with mocked
TTS. Exact-head CI passed JavaScript tests, Python tests and production build for
commit `5d3f51ad2dac0e787e968222e2ac97a23a30cbd9`.

### Not implemented or certified by this batch

No reconnect/backoff manager, central engine readiness, microphone ownership,
speaker-safe barge-in, device recovery, voice replacement, animation change or
coding execution. Live Mac validation remains deferred.

## Batch 03 - Engine readiness and stale-event protection

Base: Batch 02 commit `5d3f51ad2dac0e787e968222e2ac97a23a30cbd9`.
Branch: `engine/batch-03-readiness-stale-events`.
Status: implemented and exact-head CI passed; stacked on Batch 02.

### Implemented

- `backend/readiness.py` tracks LLM, STT and TTS independently as pending,
  preparing, ready, unavailable or deferred. Derived capabilities are chat,
  listen, speak and full voice; overall state is ready, degraded, preparing or
  unavailable.
- Startup warm-up treats engines independently. A TTS failure can leave text chat
  available; an STT failure can leave typed chat and speech output available; an
  LLM failure reports chat unavailable instead of pretending the whole runtime is
  healthy.
- Text turns continue without audio when TTS is unavailable. PCM turns fail early
  with a typed fallback when STT is unavailable. LLM-unavailable turns surface the
  transcript then a truthful local-chat error without calling the model.
- Readiness is embedded in existing `preparing` and `ready` events so the protocol
  preserves established event ordering.
- `src/conversation/runtime-events.js` installs before `main.js` creates the
  WebSocket and rejects mismatched sessions, duplicate/out-of-order sequence
  numbers, and obsolete old-bot output after a config transition.
- `src/conversation/readiness-ui.js` renders truthful compact states such as
  `Chat ready · voice unavailable` and gates voice input independently of text.

### Validation scope

Exact-head GitHub Actions passed JavaScript tests, Python tests and production
build for the final squashed Batch 03 commit
`1e0678fcd999632e7aef230f2fc5980b1a251bf9`.

### Not implemented or certified by this batch

Reconnect/backoff and engine retry policy remain incomplete. Microphone ownership,
VAD tuning, real barge-in, audio-device recovery, final voice selection, canonical
chat storage, agent/coding execution and animation lifecycle work remain later
batches. No live microphone, speaker, permissions or hardware-performance claim is
made from these tests.

## Batch 04 - Microphone ownership and listening lifecycle

Base: Batch 03 commit `1e0678fcd999632e7aef230f2fc5980b1a251bf9`.
Branch: `engine/batch-04-mic-lifecycle`.
Status: implemented with automated race coverage; live Mac validation deferred.

### Implemented

- `AudioEngine` now owns capture through one explicit process-local owner plus a
  monotonically increasing capture generation. A second capture revokes the first
  before it can remain active, preventing duplicate/orphan microphone sessions.
- Capture mode is explicit (`live` or `manual`). Late permission results and stale
  AudioWorklet frames are discarded when their generation is no longer current.
- Cleanup is idempotent and releases recorder ports, graph nodes, timers and media
  tracks without closing the shared AudioContext used by playback.
- `setListening(false)` is a true mute/listening gate: it resets turn detection and
  blocks utterance callbacks while deliberately keeping the live microphone stream
  open. Unmute can resume the same live capture.
- `src/audio/lifecycle.js` separates the three user-facing meanings: Stop speaking
  leaves capture alone, Mute gates listening, and End conversation releases the
  active capture. Full-mode live-mic End, widget End, disconnect and unload all
  release capture.
- Runtime WebSocket close emits a local lifecycle event so microphone resources are
  released even though reconnect/backoff itself remains a later batch.
- Existing VAD thresholds, Whisper/Kokoro providers, mouth equaliser, artwork,
  widget layout and coding panels are unchanged.

### Validation scope

- JavaScript tests cover pending permission cancellation, single capture ownership,
  mute-without-release, stale callback rejection, idempotent cleanup, Stop/Mute/End
  semantic separation, disconnect and unload.
- Existing VAD behavior tests remain in place; one compatibility regression found by
  CI was fixed without changing detector thresholds.
- Exact-head GitHub Actions passed JavaScript tests, Python tests and production
  build for final squashed commit `300ba2d492ed7c7ecdc9caae27a777315204eb35`.
- No real microphone, headset change, echo path, speaker playback or macOS permission
  flow has been certified by these automated checks.

### Not implemented or certified by this batch

Natural barge-in, speaker-safe interruption tuning, audio-device-change recovery,
Silero evaluation, final recognition/voice selection and live latency remain future
work. Disconnect still requires the current application restart policy.

## Batch 05 - Turn and playback coordination

Base: Batch 04 commit `300ba2d492ed7c7ecdc9caae27a777315204eb35`.
Branch: `engine/batch-05-turn-playback`.
Status: implemented with deterministic interruption-order coverage; final squashed
exact-head CI is required before integration.

### Implemented

- `src/audio/turn-playback.js` provides one deterministic coordinator for the
  current user turn, expected server audio chunks, decode work, queued playback,
  active playback and server completion.
- The WebSocket boundary records actual outgoing `turn` and `stop` messages and
  feeds only accepted, identity-checked server audio/done/error events into that
  coordinator. Old turns cannot regain authority after a new turn begins.
- `AudioEngine.setListening(true)` now refuses to reopen the live VAD gate while
  the active turn, expected audio, decode, queued audio or playback is unfinished.
  The legacy 800 ms callback in `main.js` is therefore no longer authoritative and
  cannot reopen listening during a reply; its later source cleanup remains safe to
  do separately from this bounded coordination change.
- Audio decode and playback are represented by generation-scoped tokens. Stop or a
  newer turn invalidates old decode results and prevents stale queued/playing audio
  from affecting the current turn.
- Stop speaking keeps the live microphone capture allocated, cancels the current
  turn, stops playback, and then explicitly resumes listening only for an active
  unmuted live conversation. Mute and End conversation retain their distinct Batch
  04 meanings.
- Existing VAD thresholds, STT/TTS providers, mouth equaliser, bot artwork, widget
  layout and coding panels remain unchanged.

### Validation scope

- New deterministic tests cover server-done-before-decode ordering, multiple audio
  chunks, stale old-turn tokens/events, replacement by a newer turn and immediate
  error cancellation.
- Lifecycle tests cover Stop-speaking resume only for active, unmuted live capture.
- Existing JavaScript and Python regression suites and production build passed on
  the pre-squash Batch 05 head; final squashed exact-head CI remains the authority.
- Live speaker echo, headset/device changes, real microphone behavior and natural
  barge-in are still not certified by these automated tests.

### Not implemented or certified by this batch

Natural speaker-safe barge-in, VAD quality tuning, Silero evaluation, audio-device
recovery, final speech providers/voices, canonical chat storage, animation lifecycle
and coding execution remain later work.

## Next bounded batch

Speech output delivery and TTS queue reliability. Separate display text from spoken
text, bound synthesis/playback queues, make TTS failure degrade to text without
invalidating the answer, and add deterministic chunk/cancellation tests. Keep final
voice selection and real-device listening tests deferred until the maintainer is
ready for the Mac checkpoint.
