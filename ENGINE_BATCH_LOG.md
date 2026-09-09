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
Status: implementation in review; stacked on Batch 01 so it can remain a small,
independent change while Batch 01 is still open.

### Implemented

- `backend/runtime.py` adds a versioned server-event envelope. Every integrated
  WebSocket event carries one session ID, monotonic sequence, current bot ID and
  optional turn/operation identity. This is the first runtime contract; engine,
  microphone, playback and task readiness state are not yet centralised.
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
  repeats. This is not a complete reconnect manager; socket reconnection itself
  remains a later runtime batch.
- Greeting templates were rewritten to avoid unsupported claims such as a
  prepared schedule, agenda, diagnostics or completed work. Personality remains
  distinct without asserting access the app does not have.
- Greeting failures are nonfatal and do not block the WebSocket receive loop.
  Rotation indices advance only after the greeting event is actually sent.
- Existing conversation TTS, microphone capture, mouth equaliser, bot artwork,
  UI panels and native-window code are unchanged by this batch.

### Validation scope

- Pure runtime tests verify stable session identity, bot switching and monotonic
  event sequencing.
- Greeting tests cover deterministic rotation, truthful templates, startup
  cooldown, cancellation, latest-bot-wins, settings silence and synthesis failure.
- WebSocket integration tests cover event envelopes, onboarding greeting identity
  and rapid bot switching with mocked TTS. These tests do not open a microphone,
  play sound or run a real model.
- Exact-head CI is the authority for the complete JavaScript/Python/build suite
  after the batch PR is created. Live Mac validation remains deferred.

### Not implemented or certified by this batch

- No reconnect/backoff manager, central engine-readiness model, text-only degraded
  mode, microphone ownership change, speaker-safe barge-in or device recovery.
- The browser does not yet independently reject every stale session event; the
  backend now emits identity/sequence metadata so that client-side guard can be
  added without inventing IDs later.
- If a greeting has already been delivered to the renderer before a bot switch,
  the existing local `interrupt()` path remains responsible for stopping its
  playback. This batch primarily prevents obsolete pending synthesis from being
  delivered after cancellation.

## Next bounded batch

Central readiness/recovery state and client-side stale-event filtering. Expose
truthful component availability without changing microphone/VAD behaviour yet;
then make the browser reject obsolete session/bot/operation events. Keep startup,
chat and widget usable when one engine is unavailable where practical. Continue
to defer live audio tuning until the maintainer is ready for Mac validation.
