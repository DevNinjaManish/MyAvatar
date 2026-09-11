# UI Regression Matrix

This matrix defines the canonical MyAvatar UI states protected by automated state tests and the deterministic Electron screenshot harness.

## Companion states

| State | Required visual contract |
| --- | --- |
| Compact / Ready | Companion remains in the fixed right column; toolbar and telemetry are aligned; no specialist rail is visible. |
| Listening | Companion status and accent treatment say Listening; mic is active; fixed geometry does not move. |
| Thinking | Companion status says Thinking; active treatment remains subtle; controls stay aligned. |
| Speaking | Companion status says Speaking; speaking treatment does not change shell dimensions. |
| Limited | Warning treatment is visible without replacing actionable Rivet task state. |
| Offline | Offline/error treatment wins over all other states and disables unavailable interaction. |

## Surface states

| State | Required visual contract |
| --- | --- |
| Chat open | Chat occupies the fixed right stack below the companion; specialist rail remains independent. |
| Options menu | Menu stays in the companion column; Tab is trapped within the overlay until closed. |
| Bot picker | Picker stays above companion surfaces; Tab is trapped within the overlay until closed. |
| Calendar open | Calendar occupies the fixed left specialist rail without shifting the companion. |
| Creative open | Creative occupies the fixed left specialist rail without shifting the companion. |
| Rivet open | Rivet occupies the fixed left specialist rail; Task remains the primary surface. |
| Wide diff/files | Expanded wing occupies the left rail and traps Tab while open. |

## Rivet task states

| State | Required visual contract |
| --- | --- |
| Draft | Brief is editable; Run with Rivet is available when the brief is valid. |
| Working | Stop is the contextual action; brief is read-only; quick-start and approvals-mode controls are disabled; `aria-busy=true`. |
| Awaiting approval | Approval state is warning, not failure; task is not marked busy; competing controls remain locked. |
| Blocked | Needs attention/error treatment is shown; Try again is available. |
| Complete | Success treatment is shown; View changes is available. |
| Cancelled | Cancelled treatment is distinct from failure. |

## Combination states that must not regress

1. Chat + Rivet open simultaneously: right companion/chat geometry must remain unchanged while Rivet uses the left rail.
2. Degraded readiness + Rivet awaiting approval: Awaiting approval must remain the visible actionable state.
3. Degraded readiness + Rivet blocked: Needs attention must remain visible.
4. Speaking + Rivet working: Speaking is the foreground companion status while Rivet continues in the task timeline.
5. Offline + any task state: Offline wins because execution is unavailable.
6. Menu or bot picker open: focus cannot escape behind the active overlay.

## Deterministic screenshot harness

Run:

```bash
npm run test:ui:screenshots
```

The command builds the app, launches a hidden Electron window without the normal MyAvatar backend/model startup, renders deterministic fixture states, and writes PNGs to:

```text
artifacts/ui-regression/
```

Generated screenshots are intentionally gitignored. They are local QA artifacts, not source assets.

The default fixture set is:

- `compact`
- `chat`
- `rivet`
- `chat-rivet`
- `menu`
- `picker`
- `running`
- `approval`
- `complete`
- `offline`
- `limited`

To capture a smaller subset:

```bash
MYAVATAR_UI_STATES=compact,running,approval npm run test:ui:screenshots
```

Fixture mode uses fixed Rivet artwork, fixed project/task copy, deterministic CPU/RAM placeholders, disabled animation/transitions, and no live WebSocket, microphone, calendar, or model dependency. Normal app startup does not mount fixture mode unless the explicit `?fixture=<state>` query is present.

Screenshot review should concentrate on shell position, clipping, overlap, visual hierarchy, contextual task actions, and state consistency. Behavioral correctness remains covered by the JavaScript state tests.

## Future baseline comparison

The current harness produces deterministic captures for human review. The next stage can add approved baseline images and pixel-diff thresholds once the current visual design is considered stable enough to avoid intentional polish changes creating excessive baseline churn.
