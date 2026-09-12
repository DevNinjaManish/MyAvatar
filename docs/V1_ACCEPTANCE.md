# MyAvatar V1 acceptance checklist

## Product and relationship

- [ ] Nova is the default bot and feels distinct from Rivit, Sterling, and Luma.
- [ ] Each bot has a unique voice, visual language, emotional behavior, and specialization.
- [ ] Common chat works consistently for every bot.
- [ ] Switching bots preserves the correct identity and relationship context.
- [ ] Persistent memory is useful, inspectable, editable, and forgettable.
- [ ] Activity history is summarized, visible, limited-retention, and never a raw surveillance log.
- [ ] Proactive behavior feels alive without becoming annoying.
- [ ] User can pause, mute, dismiss, or say “not now.”
- [ ] After first-run microphone consent, the app can start continuous listening when the runtime becomes ready.
- [ ] Nova gives one short ready greeting per app session without greeting on every reconnect.
- [ ] Pause/Resume, panel close, widget hide, and Quit MyAvatar have distinct behavior.
- [ ] More menu never contains a visible control that silently does nothing.
- [ ] Pause/Resume is outside More and remains reachable without opening a menu.
- [ ] More opens below the control card without resizing, repositioning, or covering the avatar.

## Voice and liveness

- [ ] User can complete repeated voice turns without the bot becoming stuck.
- [ ] Mic remains armed across automatic turns and clearly shows Listening when re-armed after a transient voice error.
- [ ] Listening, thinking, speaking, interruption, and recovery are visually clear.
- [ ] User can interrupt speech and receive immediate cancellation.
- [ ] Speech feels natural in pace, pauses, emphasis, and emotion.
- [ ] Nonverbal vocalizations are intentional, contextual, and controllable.
- [ ] Mouth animation and light equalizer follow actual bot speech.
- [ ] Voice remains available while background work continues.
- [ ] Voice failure falls back honestly to typed chat.

## Context and permissions

- [ ] Seeing Eye is visible, off by default, and immediately revocable.
- [ ] Screen snapshots are intermittent and temporary.
- [ ] Context sources identify their permissions, provenance, freshness, and failure state.
- [ ] Read permission is separate from action permission.
- [ ] User can inspect what the bot knows and why.
- [ ] Revoking context access prevents future use.

## Specialist panels and delegation

- [ ] Nova and Sterling share a simple assistant panel.
- [ ] Rivit has a simple, useful coding panel.
- [ ] Luma has a simple image generation/editing panel.
- [ ] Panels remain connected to common chat and the primary bot.
- [ ] Delegation is bounded, visible, interruptible, and loop-safe.
- [ ] System banners communicate meaningful delegated work events.

## Setup and runtime

- [ ] Beginner can install without Terminal or manual model paths.
- [ ] Setup detects Intel and Apple Silicon hardware.
- [ ] Setup chooses or explains Fast/Balanced mode.
- [ ] Initial model/runtime download is small and resumable.
- [ ] Repair and upgrade flows work after interrupted or incomplete setup.
- [ ] Fast mode supports the core experience on 8 GB Macs.
- [ ] Balanced mode remains responsive on preferred hardware.
- [ ] Model provider can be swapped without rewriting bot or UI contracts.

## QA and release

- [ ] MVP regression path passes after every batch.
- [ ] Automated code QA passes.
- [ ] Native smoke QA passes on Intel and Apple Silicon.
- [ ] Visual QA passes for all new states, panels, animations, and banners.
- [ ] Performance and thermal checks pass in Fast and Balanced modes.
- [ ] Soak and daily-use testing reveals no critical memory, voice, or state failures.
- [ ] Upgrade, migration, repair, and rollback paths are tested.
- [ ] Creator uses the product daily and considers it showcase-quality.
