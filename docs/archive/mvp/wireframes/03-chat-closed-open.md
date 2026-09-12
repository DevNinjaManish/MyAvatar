# Wireframe 03 — Closed and open chat

Journey: ready → open chat.

Closed:

```text
┌──────────────────────────────┐
│          AVATAR              │
│  ┌────────────────────────┐  │
│  │ Nova        ● Ready    │  │
│  │ [Mic]  [Chat]  […]     │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

Open:

```text
┌──────────────────────────────┐
│          AVATAR              │
│  ┌────────────────────────┐  │
│  │ Nova        ● Ready    │  │
│  │ [Mic] [Chat*] […]      │  │
│  ├────────────────────────┤  │
│  │ Chat             [×]   │  │
│  │                        │  │
│  │ What can I help with? │  │
│  │                        │  │
│  │ [Message…          ]  │  │
│  │                 [Send]│  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

Rules:

- Opening chat changes the native widget height predictably; it never opens a full-screen window.
- The text field receives focus immediately.
- Chat remains the only expanded work surface in the MVP.
- Close returns to the compact state and preserves the transcript according to the product decision.
- `Chat*` exposes `aria-expanded=true` while open.
