# MyAvatar V1 bot collaboration

## Collaboration decision

V1 supports bot-to-bot communication and delegation. Bots can ask another bot for specialist help, exchange a bounded task brief, and return the result to the primary bot.

The purpose is to make the companion system feel like a capable team without turning the product into an opaque swarm of agents.

## Primary-bot rule

The user always has a primary bot for the current interaction. That bot owns the relationship, voice, emotional continuity, and final response.

Other bots may contribute as specialists, but they do not silently replace the primary bot or start independent conversations unless the user explicitly asks to switch.

## Example flows

- Nova asks Rivit to inspect a Git error, then explains the result to the user in Nova's voice.
- Sterling asks Luma to create a visual concept for a calendar presentation, then reports what Luma produced.
- Rivit asks Nova to create a reminder after a coding task is completed.
- Luma asks Sterling to schedule a review session while she continues working on an image.

## Delegation lifecycle

1. Primary bot identifies that another bot's specialization would help.
2. It tells the user what it wants to delegate and why, unless the user has already authorized that class of delegation.
3. The specialist receives only the context and permissions needed for the task.
4. The specialist works through its own voice, visual, and tool behavior when appropriate.
5. The specialist returns a structured result, artifacts, questions, or failure state.
6. The primary bot summarizes the result and offers the next action.

## Communication contract

Bot messages use explicit task envelopes containing:

- Requesting bot
- Specialist bot
- User-visible goal
- Relevant context references
- Required permissions
- Expected output
- Cancellation and deadline state
- Relationship or memory impact

Bots should not pass unrestricted private context to one another merely because it is available locally.

## User experience

Delegation happens silently by default. The user should not hear two bots conducting an internal conversation during ordinary work.

The user should see lightweight visual collaboration cues:

- A small specialist portrait or badge
- An activity light or animated status cue
- A compact “Rivit is checking your project” state
- A completion, question, failure, or permission banner when meaningful
- An expandable detail view showing the delegated task and result

For meaningful milestones, the shared companion can show a system-style banner:

> “Rivit finished checking the repository. Nova has the result.”

The banner should be brief, dismissible, voice-readable, and distinct from ordinary conversation. The user can inspect who is working, stop the task, ask a question, or return to the primary bot.

Audible bot-to-bot exchanges remain an optional future expression mode, not the V1 default.

## V1 boundaries

- No uncontrolled bot-to-bot conversations
- No delegation loops
- No hidden actions with external consequences
- No specialist bot may broaden permissions without user approval
- One primary bot owns the final user-facing answer
- Delegated work remains interruptible and asynchronous

## Emotional behavior

Bots may have opinions about one another, teasing, rapport, rivalry, or respect when authored into their character contracts. These interactions should enrich the world without creating conflict that pressures the user or obscures what work actually happened.
