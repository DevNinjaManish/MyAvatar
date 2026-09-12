# V1 Wireframe 10 — Settings and recovery

High-fidelity reference: [Setup and settings](../design-mockups/v1-core-surfaces.html#setup).

Journey: inspect status → change a bounded preference → repair or reset safely.

```text
┌──────────────────────────────┐
│ Settings              [Done] │
│ Companion                     │
│ Voice and presence            │
│ Memory                        │
│ Context and permissions       │
│ Performance                  │
│ Privacy                       │
│ Runtime health                │
└──────────────────────────────┘
```

## Runtime recovery

```text
Conversation service unavailable
Typed chat can retry when it returns.
[Retry] [Run repair] [Continue offline]
```

## Presence and window controls

```text
Toolbar: Mic · Chat · Pause/Resume · More

More
├── Runtime health
├── Hide widget             ← window visibility
└── Quit MyAvatar           ← full app shutdown
```

Control rules:

- Pause/Resume is reversible and visibly changes the avatar to Paused or Ready.
- Hide keeps the local runtime alive; showing the widget restores the previous
  panel and focus where possible.
- Panel `×` only closes the current panel.
- Quit closes the app and runtime, and confirms if a consequential task is
  still active.
- More contains only implemented operational controls; future V1 surfaces are
  introduced as real panels when ready, not as disabled no-op rows.
- Opening More must not resize, reposition, or cover the avatar.

Rules:

- Settings use plain-language labels and show the current value plus impact.
- Dangerous or broad changes require confirmation and explain what is preserved.
- Repair checks provider, model, voice, permissions, and storage independently.
- Reset distinguishes conversation, memory, permissions, settings, and full reset.
- Recovery never falsely reports Ready; degraded capabilities remain visible.

Accessibility: stable keyboard order, descriptive status text, focus returned after dialogs, and reduced-motion support.

QA: each settings category, provider failure, model repair, permission revoke, storage issue, partial reset, full reset confirmation, restart, and recovery to Ready.
