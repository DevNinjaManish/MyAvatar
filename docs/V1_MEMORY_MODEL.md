# MyAvatar V1 memory model

## Memory layers

### Working context

Temporary information needed for the current turn or active task. It expires quickly and is not automatically retained.

### Conversation history

Recent exchanges available for continuity. Retention is user-controlled and may be cleared independently from relationship memory.

### Activity history

Summarized meaningful local activity, retained on a rolling seven-day basis by default. It does not store raw screen imagery or every click and keystroke.

### Factual memory

Stable information about the user, preferences, projects, routines, important dates, and recurring needs.

### Relationship memory

Shared moments, emotional significance, inside references, trust, familiarity, unresolved threads, and the evolving shape of the relationship.

### Bot memory

Bot-specific observations about how to help, speak, react, and collaborate with the user. Shared facts may be available across bots according to permission and relevance; private bot-specific feelings or notes require explicit policy.

## Memory lifecycle

1. Context enters as temporary information.
2. The system evaluates usefulness, sensitivity, confidence, and future value.
3. Meaningful information may become activity history or a memory candidate.
4. The bot may ask before promoting sensitive information.
5. Retrieval selects only relevant memories for the current task.
6. Memory can be corrected, forgotten, expired, or permanently deleted.

## User controls

The user can ask:

- “What do you remember about me?”
- “Why do you know that?”
- “Remember this.”
- “Forget this.”
- “Forget everything about this project.”
- “Clear my activity history.”

The UI provides the same controls with source, date, bot, category, and deletion actions.

## Retrieval rules

Memory retrieval considers relevance, recency, confidence, relationship importance, bot specialization, and user permissions. The system must not inject all stored memory into every conversation.

Forgotten items are removed from active retrieval indexes and future bot context. Deletion behavior must be tested, including cached summaries and delegated-task copies.

## Storage

V1 stores memory locally in a structured database with full-text and semantic retrieval. Raw screen frames remain temporary. Memory migrations must be versioned, tested, and recoverable.
