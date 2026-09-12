# MVP scope and requirements

## In scope

### Shell

- One compact, draggable macOS widget window.
- No full-screen mode, expanded conversation mode, or dashboard navigation.
- Clear startup, ready, unavailable, and reconnecting states.
- One consistent visual system across the shell, dialogs, and messages.

### Companion

- A small picker with the approved MVP companions and identity descriptions.
- One selected companion at a time.
- The selected name, artwork, accent, and conversation context stay synchronized.

### Conversation

- Typed text input and send.
- Voice chat through the local microphone and speech output, behind explicit permission and clear unavailable states.
- Streaming or complete assistant response shown as readable text.
- Stop response, clear conversation, and close/reopen chat.
- Stable loading, success, interruption, and error states.
- No automatic proactive greetings or actions in the first MVP cut.

### Local runtime

- A local backend connection with a per-launch authenticated channel.
- One supported local model configuration documented in setup.
- Typed chat remains available as the fallback when microphone, speech recognition, or speech output is unavailable.
- Bounded reconnect behavior with a user-visible retry path.

### Documentation and QA

- Product brief, scope, acceptance checklist, technical foundation, wireframes, and approved design reference.
- Automated tests for state transitions and core UI behavior.
- Native smoke QA for launch, typing, response, stop, companion switching, close, and relaunch.

## Explicitly out of scope

- Coding agent, terminal, Git, repository inspection, task execution, approvals, or file editing.
- Calendar, screen awareness, system HUD, creative workspace, and specialist side windows.
- Full-screen or multi-pane conversation surfaces.
- Cloud accounts, sync, analytics, external integrations, and remote model providers.
- Multiple simultaneous conversations or complex memory controls.
- Custom companion authoring, marketplaces, mobile clients, and multi-platform packaging.

## MVP user journeys

1. Launch → widget appears → runtime becomes Ready.
2. Choose companion → picker opens → selection updates name, art, and accent → picker closes.
3. Open chat → input is visible → type message → send → response appears.
4. Start response → press Stop → response visibly becomes interrupted and controls return to Ready.
5. Start voice chat → speak → local recognition sends the turn → spoken response plays in the widget.
6. Runtime or microphone unavailable → widget explains the problem → Retry or typed chat remains available.
7. Quit and relaunch → one widget appears without a second window or full-screen surface.

## Product constraints

- The MVP has one primary action: conversation.
- Every interactive state must be reachable with mouse and keyboard.
- A hidden or unavailable feature must not leave an empty button, dead surface, or misleading status.
- Native behavior is part of the MVP; browser-only rendering is not a substitute for desktop QA.
