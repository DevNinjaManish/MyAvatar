# V1 Wireframe 01 — Shared companion and common chat

Journey: launch → presence → conversation → specialist work → return to relationship.

## Compact widget

```text
┌────────────────────────────────┐
│  [drag]                 [•••]  │
│                                │
│          2.5D BOT              │
│       eyes / lights / mood     │
│                                │
│  ┌──────────────────────────┐  │
│  │ Nova          ● Ready    │  │
│  │ [Eye] [Mic] [Chat] [Bot] │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

Rules:

- The bot remains visible and expressive when chat is closed.
- `Eye` is the Seeing Eye toggle and visibly changes when active.
- `Mic` starts voice interaction and reflects listening/speaking state.
- `Chat` opens the shared conversation surface.
- `Bot` opens bot selection and switching.
- The overflow control opens the More menu defined below.
- No control should imply a capability that is unavailable.

## Control ownership

```text
More menu
├── Runtime health
├── Hide widget
└── Quit MyAvatar
```

- `Pause` is a primary toolbar control, not an overflow item. It stops proactive behavior, listening,
  speech, and background work; the avatar becomes visibly Paused.
- More is intentionally compact and contains only implemented operational
  controls. Future V1 surfaces appear in their own panels when ready, rather
  than as disabled rows in this menu.
- `Hide widget` hides the compact widget while leaving the app/runtime alive.
- `Quit MyAvatar` closes the application and local runtime. It is visually
  separated from routine controls and confirms when active work would be lost.
- A panel `×` closes only that panel and returns to the compact widget. It is
  not the same as hiding or quitting the app.
- There is no prominent power button in the compact widget. The visual “power”
  state is reserved for lifecycle animation and recovery, while user control is
  expressed as Pause/Resume.
- Opening More must not resize, reposition, or cover the avatar.

## Expanded common chat

```text
┌────────────────────────────────┐
│  [drag]  Nova ● Speaking  [×]  │
│                                │
│          2.5D BOT              │
│       mouth / light equalizer  │
│                                │
│  ┌──────────────────────────┐  │
│  │ Nova     [Eye] [Rivit ▸] │  │
│  ├──────────────────────────┤  │
│  │                          │  │
│  │ You: What should I do   │  │
│  │ next with this project? │  │
│  │                          │  │
│  │ Nova: I’m looking at it…│  │
│  │                          │  │
│  │ [Message…          ] [Mic]│ │
│  │                    [Send]│  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

Rules:

- Common chat is shared by every bot.
- The active bot owns the voice, relationship, and final response.
- The transcript shows bot identity when a specialist contributes.
- `Rivit ▸` is a lightweight specialist handoff cue, not an independent conversation.
- The user can type, speak, interrupt, stop, clear, switch bots, or open a specialist panel.
- Closing Chat returns to the compact widget without stopping the bot or runtime.
- A long-running task shows a compact progress banner without blocking chat.
- The input stays available while the bot thinks or a specialist works.

## Specialist handoff

```text
│ Nova: I’ll ask Rivit to inspect the repository. │
│ [Rivit checking project…]                    │
```

The banner is dismissible and expandable. Completion returns to the active bot:

```text
│ Rivit finished. Nova has the result. [View] │
```

## State variants

### Ready

Bot is present, idle, and available. Chat input and normal controls are enabled.

### Listening

Bot faces the user. Mic control becomes Stop. Input visualizer and listening light are visible.

### Thinking

Bot shows a meaningful thinking animation. The user can interrupt, continue typing, or wait.

### Speaking

Mouth and accent lights follow actual speech. Mic/Stop remains available for barge-in.

### Working

Bot remains present while a specialist or background job runs. A banner identifies the task and bot.

### Unavailable

The bot explains what is unavailable and offers the one best recovery action. Typed chat remains available where possible.

### Sleeping or paused

Bot dims and quiets without looking broken. Resume and unpause controls remain discoverable.

## Keyboard and accessibility

- Chat opens with the message field focused.
- Every icon has a text label or tooltip.
- Eye, Mic, Chat, Bot, Stop, Send, and Close are keyboard reachable.
- State is communicated through text and not color alone.
- Reduced motion and muted sound preserve state clarity.
- Voice commands mirror important controls: “stop,” “pause,” “open chat,” “switch to Rivit,” and “what are you doing?”

## Visual QA states

Capture approved references for compact Ready, expanded Chat, Listening, Thinking, Speaking, Interrupted, Working, Delegation, Unavailable, Sleeping, Paused, and Recovery.
