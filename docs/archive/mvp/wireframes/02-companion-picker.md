# Wireframe 02 — Companion picker

Journey: ready → choose companion → ready.

```text
┌──────────────────────────────┐
│        Your companions   ×   │
│                              │
│  [portrait] Nova             │
│             Everyday help    │
│                              │
│  [portrait] Rivet            │
│             Technical help   │
│                              │
│  [portrait] Sterling         │
│             Planning help    │
└──────────────────────────────┘
```

Rules:

- The picker is a bounded widget surface anchored to the companion control.
- One card has a clear selected state; selection updates the header before the picker closes.
- Every card has a concise identity label and accessible pressed state.
- Escape closes without changing the selected companion.
- The MVP list should be small enough to scan without an internal maze of panels.
