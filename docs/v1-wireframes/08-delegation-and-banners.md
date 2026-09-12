# V1 Wireframe 08 — Delegation and banners

Journey: primary bot explains handoff → specialist works → result returns or fails.

## Compact banner

```text
┌────────────────────────────────┐
│ Nova asked Rivit to inspect    │
│ the project · Working          │
│ [Details] [Stop]               │
└────────────────────────────────┘
```

States: Started, Working, Needs permission, Needs question, Completed, Failed, Cancelled.

Rules:

- The primary bot, goal, specialist, scoped context, and permissions are visible in Details.
- Delegation is bounded, interruptible, and cannot loop back to itself.
- The primary bot remains the final conversational owner.
- Completion includes a concise result and an optional View action; failure includes retry or continue-without-specialist.
- No audible bot-to-bot conversation is required for V1.

QA: start, progress, question, permission, completion, failure, cancellation, timeout, duplicate request, loop rejection, and restart recovery.
