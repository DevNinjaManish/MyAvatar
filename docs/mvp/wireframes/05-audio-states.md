# Wireframe 05 — Optional microphone states

Voice chat is a first-class MVP path. Typed chat remains available whenever audio is unavailable and must never be blocked by microphone permissions or speech failures.

```text
Permission needed       Listening              Muted / unavailable
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ Microphone        │   │ Microphone        │   │ Microphone        │
│ Allow mic to talk │   │ Listening…        │   │ Mic unavailable   │
│ [Allow]           │   │ [Stop listening]  │   │ [Retry]           │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```

Rules:

- Typed chat stays enabled in every microphone state.
- Permission is explicit; the app does not silently begin recording.
- The microphone control label describes the current action, not an internal state name.
- Stopping audio releases or pauses only the resources defined by the approved runtime contract.
