# Engine implementation batches

The approved target design is [ENGINE_IMPROVEMENT_PLAN.md](ENGINE_IMPROVEMENT_PLAN.md).
Keep changes small and independently reviewable. Start branches from the current
integrated `main`; do not treat earlier merge permission as automatic approval
for every subsequent engine change. Native Mac validation remains deferred.

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
  This does not change native permission-prompt behaviour or the capture engine.
- Saved IDs, booleans and greeting indices are type-checked. Unknown provider,
  prompt and model overrides in settings are not applied. Legacy versionless
  settings remain readable; subsequent successful saves use schema version 1.
- Saves use a private same-directory temporary file, flush/fsync, then atomic
  replacement. A failed write retains the previous file and current in-memory
  session. Warnings are redacted local logs; widget-visible recovery messaging
  belongs to the later runtime/readiness batch. Concurrent snapshots are last
  successful writer wins, not an interprocess preference merge.
- `backend/approvals.py` repairs the existing `random.token_hex` defect using
  `secrets.token_hex`. Only an exact live request can be allowed once or denied.
  Invalid/forged IDs, duplicate decisions and late approvals are ignored.
  Timeout, cancellation and notification failure remove pending approval state.
- `backend/app.py` delegates to these modules with a small integration change.
  The existing narrow Mac action parser, result reporting and image-origin
  action rejection remain in place. This does not add a coding executor or
  authorize any new action. Tests replace the Mac executor with a mock.

### Validation performed for this batch

- 37 new tests in `tests/test_settings.py` and `tests/test_approvals.py`.
- 54 Python tests passed locally, including the 17 unchanged existing server and
  chunk tests. In-process WebSocket tests mock model output, synthesis and Mac
  actions. No model downloads, real microphone capture or Mac action occurred.
- Python compile checks passed.
- Replayed two integration regressions against the original `backend/app.py`:
  the action request failed with the original `random.token_hex` error and a
  corrupt preference file failed during JSON decoding. Both pass after the fix.
- The local copy of the baseline Python modules/config/tests was obtained from
  the GitHub connector and verified against its Git blob hashes. Direct network
  checkout/package downloads are unavailable in this environment. The UI and
  native app were not run locally; inspect exact-head CI separately.

Reproduce the Python suite with:

```sh
MYAVATAR_WARMUP=0 MYAVATAR_TOKEN=development .venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
```

### Not implemented or certified by this batch

Full runtime/event state, startup readiness/reconnect, greeting scheduling,
complete repository-config numeric/provider compatibility validation, the
Fast/Balanced-only UI migration, voice/listening improvements, chat-store work,
animation changes and coding execution remain planned. Current greeting copy
and the microphone/voice implementation are unchanged. Existing lifecycle and
native-validation limitations are not marked resolved by these unit tests.

## Next bounded batch

Runtime/readiness event contracts and cancellable greeting lifecycle. Preserve
one active companion/voice session; no stale bot greetings, no settings-change
welcome spam, user input outranks greeting playback. Add event-ordering and
cancellation tests before wiring changes into live playback. Keep Mac-only
verification as an explicit later checkpoint rather than requesting it after
every code iteration.
