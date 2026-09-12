# V1 Wireframe 04 — Memory and relationship

High-fidelity reference: [Memory, context and trust](../design-mockups/v1-core-surfaces.html#trust).

Journey: inspect → correct or forget → confirm retrieval removal.

## Memory home

```text
┌──────────────────────────────┐
│ Nova’s memory                 │
│ [Search memories…        ]    │
│ Recent                         │
│ “Prefers morning planning”    │
│ Nova · Preference · Yesterday │
│ “MyAvatar project”             │
│ Activity · Today               │
│                                │
│ [Categories] [Clear history]  │
└──────────────────────────────┘
```

## Memory detail

```text
┌──────────────────────────────┐
│ Prefers morning planning      │
│ Source: conversation          │
│ Bot: Nova   Saved: Sep 12     │
│                                │
│ [Edit] [Forget] [Close]       │
└──────────────────────────────┘
```

Rules:

- Show source, date, bot, category, and confidence when useful.
- Forget removes the item from active retrieval and delegated copies where possible.
- “Forget this” from chat identifies the referenced memory before deletion and confirms the result.
- Clearing activity does not silently delete relationship memory; scope is explicit.
- Empty, unavailable, and migration states explain what remains usable.

Accessibility: keyboard search, visible focus, confirmation copy, and non-color deletion feedback.

QA: search, edit, forget, category clear, bulk clear, bot-specific memory, failed removal, restart persistence, and export/repair states.
