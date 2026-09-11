# Wireframe 04 — Conversation states

Journey: type → send → response → stop or complete.

```text
Ready                    Sending / responding
┌──────────────────────┐  ┌──────────────────────┐
│ Chat          Ready  │  │ Chat       Thinking  │
│                      │  │                      │
│ What can I help with?│  │ You: Plan my day     │
│                      │  │                      │
│ [Message…     ][Send]│  │ Companion is working │
└──────────────────────┘  │              [Stop]  │
                          └──────────────────────┘

Complete                  Interrupted / failed
┌──────────────────────┐  ┌──────────────────────┐
│ Chat          Ready  │  │ Chat     Needs review│
│ You: Plan my day     │  │ You: Plan my day     │
│ Nova: …              │  │ Response interrupted │
│ [Message…     ][Send]│  │ [Try again]          │
└──────────────────────┘  └──────────────────────┘
```

Rules:

- User and assistant messages have distinct roles and stable ordering.
- Sending disables duplicate submission and shows an authored progress label.
- Stop is visible only during an active response and returns the conversation to a truthful state.
- Errors explain the recovery action without exposing raw protocol or stack details.
- Empty, loading, complete, interrupted, and failed states are represented in both text and accessibility semantics.
