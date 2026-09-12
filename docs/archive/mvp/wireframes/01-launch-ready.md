# Wireframe 01 — Launch and ready

Journey: launch → runtime ready.

```text
┌──────────────────────────────┐
│        [drag / identity]     │
│                              │
│          AVATAR              │
│                              │
│  ┌────────────────────────┐  │
│  │ Nova        ● Ready    │  │
│  ├────────────────────────┤  │
│  │  [Mic]   [Chat]   […]  │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

Rules:

- The native window is compact and widget-only.
- The avatar, selected companion, and Ready state are visible without opening a panel.
- Mic is disabled until audio permission/readiness is known.
- Chat is the primary entry point; no specialist or full-screen control is present.
- Initial keyboard focus lands on the chat control or the first available primary action.

States:

- Starting: `Preparing local runtime…`; Mic disabled.
- Ready: `Ready`; Chat enabled; Mic enabled only when audio is ready.
- Unavailable: `Can’t connect`; one `Retry` action appears in the status surface.
