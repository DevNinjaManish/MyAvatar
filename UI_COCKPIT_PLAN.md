# Widget Cockpit V1

Work-in-progress UI branch: `ui/widget-cockpit-v1`. Keep PR #1 in draft until native macOS validation.

## Locked direction

Existing floating bust above a restrained cockpit; Mic, Chat, Tools, More stay visible. Only one full bot is rendered. Chat and coding panels remain attached to that widget. A larger conversation view remains optional under More, not the default Tools destination. No pinning, new bodies, renamed bots, or replacement artwork.

Rivet is the coding specialist (weathered teal/orange repair robot). Nova is the rose assistant, Sterling the navy/gold butler, Pixel the pink/lime marketer, and Luma the white/cyan product designer. Future delegation uses small activity chips, not more live avatar renderers.

Speaking continues to use `PortraitFace.paintHardware()` and TTS output at each bot's existing mouth/speaker coordinates. Idle/listening/thinking must not illuminate the speech equaliser. Do not substitute a cockpit waveform, visor overlay, or newly generated robot art.

## Implemented in the second UI pass

- Tools opens an attached stack: Task, Files / Changes, Terminal, Tests, Git / Diff.
- Every panel has an accessible disclosure button; at most two panel bodies are expanded. Collapse all and Close tools remain available.
- File and diff views can unfold sideways. Native layout chooses left/right according to available screen space, clamps to the current monitor's work area, and falls back to an inline view on narrow work areas.
- The compact-column anchor is preserved when expanding, collapsing, or dragging a wide layout. Default 260 x 338 and chat-only 260 x 570 are retained; tools and combined views request more height but never exceed the work area.
- Chat and Tools can remain open simultaneously. Closing one does not close the other. No renderer or audio session is created when opening a panel.
- Escape closes the expanded view or Tools before the existing global speech interrupt handler. Menus and focused chat retain their existing Escape handling.
- Task brief is an in-window draft, not an agent queue. Discuss in chat copies it to the existing chat input without sending. Only panel disclosure preferences persist locally, never task text or a project path.
- Choose folder opens a native directory picker. This pass receives only a display name; it creates no access grant and does not read files, launch commands, or transfer a project path to the model.
- Microphone/mute is never hidden during speech. Stop has its own contextual position beside status; the four main controls remain stable.
- Existing artwork, avatar renderer, speech providers, prompts, and `src/main.js` are unchanged.

## Important limitations

This is a usable UI shell, not an implemented coding agent. Terminal execution, file reads/edits, Git operations, test execution, approvals, live telemetry, and delegation are not connected. No fake progress percentage, test passes, Git status, or busy agents are shown. Execution actions remain disabled with explanations.

Existing voice conversation remains available. The new panel navigation is click/keyboard-driven in this pass; deterministic voice tool navigation and real task execution still need explicit integration with the local orchestrator. Do not infer commands from rendered assistant messages or screen-observation text.

Folder selection is intentionally only a UI label. Phase 3 must introduce a main-process-owned authorised project root and enforce access separately; this picker is not a security sandbox or an executor permission.

## Implementation map

- `src/widget-entry.js`: load the unchanged application, then widget CSS and panel controller.
- `src/widget/panel-model.js`: pure disclosure state and sanitised local preferences.
- `src/widget/panels.js`: DOM bindings, task draft, safe text rendering, Escape/focus behaviour, narrow desktop calls.
- `src/widget-panels.css`: attached stack and wide panel layout.
- `electron/widget-layout.cjs`: pure work-area geometry and boolean IPC validation.
- `electron/main.cjs` / `preload.cjs`: narrow panel resizing and explicit native folder picker; no generic filesystem/shell API.

## Validation for this pass

`node --test tests/widget-*.test.mjs`: **40 passing tests**, including panel state, preference sanitisation, dimensions, monitor edges, narrow/negative-coordinate work areas, single-stage markup, four controls, mocked Electron IPC, subframe rejection, and folder-picker behaviour.

Additional local headless Chromium fixture: **25 passing shell checks** for disclosures, microphone/Stop visibility, Escape, task draft copying, simultaneous Chat/Tools, wide layout, and mode cleanup. That fixture used source-derived base CSS, a static real Rivet asset and mocked native/voice interfaces. It was not a live Electron/MLX/audio run and is not evidence of mouth-animation or native-window rendering correctness.

The full dependency-installed build, existing complete test suite, native macOS transparency/dragging/focus, multi-monitor transitions, and live microphone/TTS round trips have **not** been run in this environment. The repository could be read/written through the connector, but direct package/repository downloads were unavailable. No new runtime dependency is introduced.

Before merging, run the complete repository tests and `npm run build`, then `npm start` on the Mac. Check all five bots, real mouth equalisation, mic/mute/Stop, Chat+Tools, wide view at both screen edges, keyboard focus, folder-picker cancellation, and a return from expanded conversation. Keep the PR unmerged until this passes.

## Next backend boundary

Introduce a local project-scoped execution service with typed status events, cancellation, timeouts/output limits and explicit permissions. Bind real task/file/terminal/test/diff results to these panels. Reuse the existing STT/TTS paths for voice commands; do not spin up extra speaking sessions per panel. Display 'queued', 'running', 'waiting for approval', 'failed' and 'completed' only from real task state. Keep speech Stop distinct from cancellation of an executing coding task.
