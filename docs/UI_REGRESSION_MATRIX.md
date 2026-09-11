# UI Regression Matrix

This matrix defines the canonical MyAvatar UI states that future automated screenshot coverage should capture. The current JavaScript regression suite protects the DOM, state-model, accessibility and fixed-shell contracts for these states.

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

## Screenshot automation target

When browser/Electron screenshot automation is added, capture at minimum:

- compact-ready
- compact-listening
- compact-speaking
- compact-offline
- chat-open
- menu-open
- bot-picker-open
- rivet-draft
- rivet-working
- rivet-approval
- rivet-blocked
- rivet-complete
- chat-plus-rivet
- calendar-open
- creative-open
- wide-diff

Use a deterministic local fixture mode: fixed bot, fixed text, fixed CPU/RAM placeholders, disabled animation, and no live network/model dependency. Screenshot tests should compare layout and presentation only; behavioral correctness remains in the JavaScript state tests.
