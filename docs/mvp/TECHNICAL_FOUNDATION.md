# MVP technical foundation

## Rebuild boundary

The prototype has been intentionally removed. This repository now contains only the MVP shell, small renderer contracts, avatar primitives, and planning assets.

The first implementation slice should contain only:

```text
Electron main process
  ├─ one widget BrowserWindow
  ├─ trusted, minimal preload bridge
  └─ widget lifecycle

Renderer
  ├─ widget shell
  ├─ companion picker
  ├─ chat store and message view
  ├─ typed input flow
  └─ microphone and playback adapters

Conversation service (next slice)
  ├─ authenticated WebSocket session
  ├─ conversation request/response contract
  └─ bounded readiness and error events
```

## Boundaries

- Renderer owns presentation and user intent, never shell authority.
- Main process owns window geometry, lifecycle, permission boundaries, and allowed local bridges.
- Local service owns model orchestration and conversation state, never UI layout.
- Shared contracts use explicit typed events with session, companion, request, and turn identity.
- Voice is a first-class MVP path, but audio failure cannot prevent typed chat from working.

## State model

The MVP needs separate, small state machines for:

- `app`: starting, ready, unavailable, stopping;
- `chat`: closed, open, sending, responding, interrupted, failed;
- `companion`: selected identity and selection transition;
- `audio`: unavailable, permission-needed, ready, listening, speaking, stopped.

No visual label may be derived from an arbitrary backend string. Each state maps to an authored label and a documented recovery action.

## Repository preparation

During implementation:

- Keep MVP planning assets under `docs/mvp/`.
- Put wireframes under `docs/mvp/wireframes/`.
- Put approved design references under `docs/mvp/design/`.
- Do not reintroduce deleted prototype surfaces without an explicit scope decision.
- Build one vertical slice at a time: shell, local conversation service, typed chat, then voice input/output on the same contract.

## Definition of done for planning

Planning is complete when the product brief, scope, acceptance checklist, technical foundation, wireframes for every MVP journey, and one approved visual mockup agree with each other. Any disagreement becomes a planning issue, not an implementation guess.
