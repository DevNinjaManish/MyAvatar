# Bot Intelligence Batch 2 — Session continuity

This batch keeps continuity deliberately session-scoped. It does not add a new persistent memory store.

## Behavior

- Nova treats the most recent unresolved user goal in her own conversation history as the current focus.
- Sterling tracks the latest unfinished commitment or decision in his own conversation history.
- Pixel tracks the latest campaign, audience, launch, or growth objective as the active marketing objective.
- Luma tracks the latest product, screen, visual direction, or design problem as the active design brief.
- Rivet keeps its existing coding workspace/history behavior; this batch does not expand coding authority.

All companions are explicitly told that session continuity is temporary and that they must not claim memory for context that is not actually present in conversation/tool context.

## UI

The canonical chat store now keeps a small per-bot `Current focus` value in memory. It is derived from the latest user transcript/history entry, capped at 140 characters, restored when switching back to a bot, and cleared with that bot's conversation. The focus is displayed as a compact non-interactive session-context chip above the conversation.

Nothing from this focus layer is written to preferences or a new persistence file.

## Safety/limits

- No cross-bot leakage: each bot has its own focus slot.
- No new background actions or unsolicited messages.
- No new persistent memory.
- No new Rivet permissions.
- Long user text is bounded before being held as the UI focus label.
