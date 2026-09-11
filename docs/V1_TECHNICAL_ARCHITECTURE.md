# MyAvatar V1 technical architecture

## System shape

```text
Electron shell and renderer
        ↓ typed event bridge
Local orchestrator service
        ├─ conversation and turn manager
        ├─ voice pipeline
        ├─ bot/persona runtime
        ├─ memory and retrieval
        ├─ context collectors
        ├─ permission and action broker
        ├─ model adapter registry
        ├─ delegation router
        └─ interruptible job queue
```

## Ownership

- Electron main process owns windows, lifecycle, native permissions, and safe bridges.
- Renderer owns presentation, input, animation, panels, and user intent.
- Orchestrator owns conversation state, bot routing, memory, context composition, and task lifecycle.
- Providers implement models, voice, vision, calendar, Git, files, images, and system context behind explicit interfaces.
- Action broker is the only path from bot intent to consequential local action.

## AI harness boundary

MyAvatar needs the capabilities commonly called an AI harness, but V1 does not
adopt a heavyweight external harness framework. The local orchestrator is the
product-owned harness boundary: it assembles bot instructions and permitted
context, selects a provider and performance profile, manages streaming and
interruption, routes tools and delegation through permissions, and records
typed runtime events for QA.

The provider registry keeps model/runtime implementations replaceable without
coupling bots, memory, or the UI to Ollama. Harness behavior should remain
small, explicit, and testable. Add abstractions only when a concrete V1 need
appears, such as a second provider, retrieval, tool execution, or specialist
delegation.

## Event model

All systems communicate through typed events containing session, bot, request, task, and turn identity. Important event families include:

- `app.*`
- `voice.*`
- `conversation.*`
- `bot.*`
- `memory.*`
- `context.*`
- `capability.*`
- `delegation.*`
- `job.*`
- `ui.*`

Events drive both behavior and visual QA so the UI does not infer state from arbitrary provider strings.

## Conversation and voice

The turn manager coordinates VAD, streaming transcription, endpointing, model generation, streaming TTS, nonverbal audio, interruption, and transcript updates. Speech cancellation is immediate and never waits for model completion.

## Models

Model adapters support chat, streaming, cancellation, structured output, embeddings, and optional vision. Fast and Balanced profiles select models, context depth, retrieval breadth, and visual quality without changing bot identity. Ollama may be the first adapter.

## Context

Each source is an independent collector with permission, health, freshness, and provenance. Seeing Eye snapshots are on-demand/intermittent while enabled. Context is normalized before bots receive it.

## Memory

Use a local structured store with full-text and semantic retrieval. Keep working context, activity history, factual memory, relationship memory, and bot memory logically distinct even if they share storage infrastructure.

## Panels

Common chat and specialist panels consume the same conversation, bot, voice, memory, permission, and job contracts. Panels cannot create their own hidden runtime or bypass the orchestrator.

## Jobs and delegation

Long work runs in an interruptible queue. Delegation uses bounded task envelopes with primary bot, specialist bot, goal, context references, permissions, cancellation, deadline, and result. Loops and unrestricted context passing are rejected.

## Packaging and setup

The installer detects architecture, memory, disk space, runtime health, and available dependencies. It downloads the smallest suitable model set, supports resume/repair, and exposes a provider health report without requiring Terminal.
