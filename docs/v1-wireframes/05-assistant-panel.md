# V1 Wireframe 05 — Assistant panel

Journey: request → focused planning task → confirmation → return to companion.

```text
┌────────────────────────────────┐
│ Nova · Assistant       [×]     │
│ [Today] [Plan] [Reminders]     │
├────────────────────────────────┤
│ Today                          │
│ 10:00  Team meeting            │
│ 14:00  Focus block             │
│                                │
│ Nova: I found one conflict.    │
│ [Resolve] [Ask Nova]           │
│                                │
│ [Message…                 ]    │
└────────────────────────────────┘
```

Rules:

- Nova or Sterling remains the relationship owner while the panel is open.
- Read-only results appear immediately; creating or changing an item requires confirmation.
- Voice remains available, with the same bot identity and interruption behavior.
- Loading, empty, offline, permission, conflict, and completion states are explicit.
- Every consequential action has a review step showing what will change.

QA: open/close, tab switching, voice command, calendar permission, conflict, confirmation, cancellation, offline mode, and return-to-chat continuity.
