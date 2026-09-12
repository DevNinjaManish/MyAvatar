# V1 Wireframe 06 — Rivit coding panel

High-fidelity reference: [Specialist surfaces](../design-mockups/v1-core-surfaces.html#specialists).

Journey: inspect project → explain → prepare safe check or patch → user approval.

```text
┌────────────────────────────────┐
│ Rivit · Project check   [×]    │
│ Project: MyAvatar       [⋯]    │
├────────────────────────────────┤
│ Branch: main   Changes: 2      │
│                                │
│ Findings                       │
│ ✓ 74 tests passing             │
│ ! Provider fallback untested   │
│                                │
│ [Explain] [Prepare patch]      │
│ [Run safe check]               │
└────────────────────────────────┘
```

Rules:

- Rivit can inspect selected project files and Git state within permission scope.
- Commands show exact command, target, and expected effect before approval.
- Destructive commands, publishing, broad edits, and unrestricted terminal access are unavailable in initial V1.
- Prepared patches are reviewable and reversible; execution is separate from preparation.
- Nova remains available to summarize results and return to common chat.

QA: no-project, permission denial, dirty tree, safe check approval, patch review, cancellation, command failure, timeout, and no destructive path.
