# MyAvatar V1 bot framework

## Decision

V1 uses one shared bot framework with authored bot configurations. Every bot runs on the same underlying lifecycle, memory, context, voice, emotion, capability, and background-work contracts, while each bot exposes a different character and subset of capabilities.

Bots are not merely prompts with different names. A bot is a defined character system with:

- Persona and relationship role
- Voice, speech rhythm, vocabulary, and conversational style
- Emotional model and visible moods
- Memory policy and relationship history
- Context sources it is allowed to use
- Specializations and tools
- Proactivity and interruption style
- Visual identity and animation language
- Fast and Balanced runtime behavior

## Capability model

Capabilities are declared by the bot and granted by the user. A bot should not imply access to a source or action it does not have.

Example capability families:

- Conversation and voice
- Current project and workspace
- Files and folders
- Git repositories
- Calendar and reminders
- Screen awareness
- Browser context
- System state
- Long-running background work

The framework must support bots that specialize deeply without requiring every bot to expose every capability.

## Emotional model

Each bot has an authored emotional vocabulary, baseline temperament, triggers, recovery behavior, and expression intensity. Feelings and moods can change over time and can be expressed in voice, words, timing, animation, and initiative.

Emotional expression should create character and continuity. It must not rely on coercive pressure, manufactured emergencies, or preventing the user from leaving. The user can always pause, mute, switch, or close the companion.

## Relationship model

The relationship layer tracks shared history, familiarity, trust, preferences, important moments, unresolved threads, and the user's preferred interaction style. It is distinct from factual memory so a bot can remember both what happened and what it means within the relationship.

## Proactivity model

The companion is allowed to react continuously and initiate occasionally. Initiative is selected from context, emotional state, unfinished work, bot specialization, and the user's current availability.

Proactivity has four forms:

1. **Ambient reaction:** expression, animation, or short acknowledgment while the user works.
2. **Contextual suggestion:** a useful observation or offer related to the current project or goal.
3. **Background completion:** work continues asynchronously and the bot reports back when ready.
4. **Direct initiation:** the bot starts a conversation when there is a strong personal, emotional, or practical reason.

Direct initiation must respect quiet hours, focus state, recent dismissal, and a per-bot natural frequency. The user can always say “not now,” pause the bot, or disable proactivity.

## Runtime contract

Real-time voice interaction has priority over extended work. Long tasks must yield status events, remain interruptible, and never block listening, speaking, or basic companion interaction.

The framework exposes two runtime profiles:

- **Fast:** low-latency interaction, smaller local models, reduced context processing, and MacBook Air baseline support.
- **Balanced:** higher-quality reasoning, richer context synthesis, and more capable local processing when available.

The bot remains itself across both profiles; only execution quality, depth, and latency change.

## V1 framework boundary

The shared framework owns the contracts and lifecycle. Bot-specific design owns the character, specialization, allowed capabilities, emotional style, and initiative preferences. No bot is permitted to silently bypass the shared permission, memory, interruption, or user-control rules.

V1 supports simple specialist windows. The shared companion widget remains the relationship layer, while a focused panel can consume the same bot contracts for a practical task. Specialist windows must stay narrow in scope, voice-friendly, interruptible, and visually connected to the bot.

Initial V1 panel mapping:

- Nova and Sterling: shared assistant panel for calendar, reminders, planning, and everyday actions
- Rivit: lightweight coding-agent panel
- Luma: lightweight image-generation and image-editing panel

Panels are not independent products. They inherit the bot's identity, memory, permissions, emotional state, voice, and background-work lifecycle.
