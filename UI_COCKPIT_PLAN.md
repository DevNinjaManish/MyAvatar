# Widget Cockpit V1

Baseline introduced through PR #1 (`ui/widget-cockpit-v1`). On 2026-09-09 the maintainer authorised committing the engine roadmap and merging the accumulated UI work into `main`. This supersedes the earlier draft-only/pre-merge Mac hold. Native validation remains deferred and open; integration is not release qualification. Follow-up branches should start from the integrated `main` baseline, after checking actual repository state.

The next engine milestone is defined in [ENGINE_IMPROVEMENT_PLAN.md](ENGINE_IMPROVEMENT_PLAN.md). This document records the implemented UI and its locked design, not a completed coding executor.

## Locked direction

Existing floating bust above a restrained cockpit; Mic, Chat, Tools, More stay visible. Only one full bot is rendered. Chat and coding panels remain attached to that widget. A larger conversation view remains optional under More, not the default Tools destination. No pinning, new bodies, renamed bots or replacement artwork.

Rivet is the weathered teal/orange coding robot. Nova is the rose assistant, Sterling the navy/gold butler, Pixel the pink/lime marketer and Luma the white/cyan product designer. Future delegation uses small activity chips, not more live avatar renderers.

Speaking continues to use `PortraitFace.paintHardware()` and actual TTS output at the existing mouth/speaker coordinates. Idle/listening/thinking must not illuminate the speech equaliser. Do not substitute a cockpit waveform, visor overlay or generated replacement robot.

## Implemented UI foundation

- Tools opens Task, Files/Changes, Terminal, Tests and Git/Diff in attached panels.
- Accessible disclosure controls; at most two bodies open; Collapse all and Close tools.
- File/diff views unfold sideways according to available work-area space, with a narrow inline fallback.
- Compact-column anchor handling; default 260 x 338 and chat-only 260 x 570 retained. Larger stacks request bounded additional height.
- Chat and Tools can coexist without another renderer/audio session.
- Escape and focus handling close panels before the existing global speech interrupt path where appropriate.
- Task brief is an in-window draft, not an agent queue. Discuss in chat copies without sending and protects existing unsent text.
- Only disclosure preferences persist; no task text or project path is saved by these panels.
- Native folder selection returns only a display name. It creates no project/file/command access grant.
- Microphone/mute remains visible during speech. Stop is contextual beside status.
- Original artwork, avatar renderer, speech providers, prompts and `src/main.js` were unchanged by these UI passes.

The later polish pass adds readability, keyboard navigation, reliable focus restoration, distinct empty states and folder pending/cancel/error handling. See [UI_POLISH_HANDOFF.md](UI_POLISH_HANDOFF.md).

## Important limitations

This is a functional UI shell. Coding file reads/edits, command execution, tests, Git operations, task approvals, live resource telemetry and delegation are not connected. Actions remain disabled with explanations. No fake progress, test passes, Git status or busy agents are shown. Existing narrow Mac action tags elsewhere in the app are not this executor.

Existing voice conversation remains available. New panel navigation is click/keyboard-driven until it is explicitly integrated with the local command router. Never infer commands or approvals from assistant prose or screen-observation text.

Folder selection is a UI label, not a security sandbox. Future execution requires an authorised root and separately enforced permissions/containment. Do not equate a working directory with an OS sandbox.

## Implementation map

- `src/widget-entry.js`: existing application followed by widget/polish CSS and panel controller.
- `src/widget/panel-model.js`: pure disclosure state and sanitised optional preferences.
- `src/widget/panels.js`: DOM bindings, draft protection, safe text, focus and narrow desktop calls.
- `src/widget-cockpit.css`, `src/widget-panels.css`, `src/widget-polish.css`: presentation, stack and wing layout.
- `electron/widget-layout.cjs`: pure work-area geometry and boolean IPC validation.
- `electron/main.cjs` / `preload.cjs`: narrow resizing and folder picker, not a generic filesystem/shell bridge.

## Validation record

Historical second-pass results at `c792d63`: 40 panel/native-mock tests and 25 headless shell checks. The shell fixture used source-derived base CSS, static real Rivet artwork and mocked native/voice interfaces. It was not live Electron/MLX/audio or mouth-animation validation.

Historical polish results at `bc40c4f`: 14 targeted tests, syntax check and 37 isolated UI-fixture checks, detailed in the polish handoff. These are separate runs, not a single cumulative end-to-end certification.

GitHub Actions subsequently reported successful JavaScript tests, Python tests and production build for `bc40c4f` ([run](https://github.com/DevNinjaManish/MyAvatar/actions/runs/34356589056)). Check the exact revision's CI when making later changes.

Native Mac checks remain deferred: transparency, dragging/focus, monitor transitions, all five live bots, actual mouth equalisation, mic/mute/Stop, Chat+Tools, wide views at both screen edges, folder cancellation and return from expanded conversation. The maintainer's integration decision does not mark these checks complete. Rerun tests/build and complete the applicable native checklist before release qualification.

## Next implementation boundary

Prioritise shared runtime/configuration and regression coverage, then startup/greeting reliability, listening, speech and shared chat. Preserve the widget while these engines are improved; the detailed order is in the engine plan. Only then connect structured task/capability events and later project-scoped coding execution. Speech Stop remains separate from task cancellation, and status must always come from real task/engine state.
