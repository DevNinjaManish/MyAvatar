# Wireframe 06 — Recovery, quit, and relaunch

Journey: failure → retry or quit → relaunch.

```text
┌──────────────────────────────┐
│ Nova              ● Offline  │
│                              │
│  The local runtime is        │
│  unavailable right now.      │
│                              │
│        [Retry]               │
│                              │
│  [Chat remains available     │
│   if text service is ready]  │
└──────────────────────────────┘
```

Rules:

- Recovery is local and bounded; repeated retries do not create duplicate connections.
- Quit closes the one widget window and releases microphone/socket resources.
- Relaunch returns to one compact widget, never a stale full-screen view.
- The last selected companion may be restored, but no unsent message or task is silently executed.
