# V1 Wireframe 03 — Context and Seeing Eye

Journey: permission → context use → explanation → revoke.

## Context status

```text
┌──────────────────────────────┐
│ Context                         │
│ Seeing Eye             OFF     │
│ Project     Available          │
│ Calendar    Not connected      │
│ Screen      Paused             │
│                                │
│ [Manage permissions] [Done]    │
└──────────────────────────────┘
```

Rules:

- Seeing Eye is off by default and has one unmistakable global toggle.
- Each source shows status, last-used time, permission, and failure state.
- A bot requests the smallest useful source and explains why before access.
- Responses show a compact “Used project context” or “Screen context is on” cue when context materially influenced them.
- Revoke, pause, and clear temporary context are always available.

## Permission prompt

```text
Nova needs project context to answer this accurately.
She can read the selected folder, not change it.
[Allow once] [Allow for this project] [Not now]
```

Failure states: unavailable source, expired permission, stale context, and user denial all preserve typed chat and offer retry or continue without context.

Accessibility: permission text is plain language; state is never color-only; Seeing Eye changes are announced to assistive technology.

QA: off/on, first request, allow once, persistent allow, deny, revoke, source failure, stale-data explanation, and reduced-motion captures.
