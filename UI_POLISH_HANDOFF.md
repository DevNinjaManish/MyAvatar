# UI polish handoff

Continue on `ui/widget-cockpit-v1`, Draft PR #1. Read `UI_COCKPIT_PLAN.md` for the panel architecture. Do not merge yet.

## Current scope

The user has deferred work that needs their Mac and asked to continue UI and UI polish. Native macOS validation is a later pre-merge checkpoint, not a blocker for isolated UI iterations. Do not ask the user to run the app after every visual pass. Pause coding-executor integration, model changes, OS permissions work and native window changes for now.

Keep the floating bust above its minimal cockpit, four controls (Mic, Chat, Tools, More), one large bot, and attached expandable/collapsible panels. Keep the existing assets and mouth-speaker equaliser untouched. Rivet is the weathered teal/orange coding robot; Luma is the white/cyan designer; Nova is rose; Sterling is navy/gold; Pixel is pink/lime. No renamed bots, full bodies, pinning or replacement artwork.

## This polish pass

- Added widget-scoped typography, spacing, legible disabled controls, restrained active states and keyboard focus rings. No new animations, dependencies or renderer instances.
- Kept the native compact column dimensions and all four main controls; microphone remains visible alongside contextual speech Stop.
- Added Up/Down/Home/End navigation on panel headers without hijacking editing keys.
- Collapse all now disables when appropriate and leaves focus on a usable header. Closing a wide view restores focus even if its originating panel has collapsed.
- Discuss in chat preserves an existing unsent draft and explains the conflict instead of overwriting it. Copying never submits a message or starts a task. Overlong text is rejected rather than silently truncated.
- Folder selection now has a pending label and busy state, readable errors, cancellation recovery and disposal guards. This remains the same display-name-only picker; it grants no file or command access.
- Files and Diff have distinct, honest empty states. Task labels distinguish an empty form from an actual draft.

## Validation

`node --test tests/widget-polish.test.mjs`: 14 passing targeted tests. `node --check src/widget/panels.js` passed.

An offline isolated Chromium fixture passed 37 UI checks, including narrow-column containment, the five bot names, control visibility, disclosure keyboard navigation, draft preservation, text-only project names, folder cancellation/error states, focus restoration and reduced motion. It used the real panel controller and widget styles, reduced source-derived base CSS, inlined local module bodies, static uploaded Rivet artwork and mocked desktop/voice handlers. It was not Electron, the full application, live voice or mouth-animation validation.

The earlier panel/native-mock results are documented in `UI_COCKPIT_PLAN.md`. They were not rerun in this polish pass. The complete dependency-installed build and test suite, native macOS appearance/dragging, monitor transitions, microphone and TTS still require validation before merging.

## Suggested next UI-only pass

Refine companion-picker and More-menu density, keyboard help, and narrow file/diff empty-state layout. Keep unavailable execution, telemetry and delegation clearly unavailable; do not invent running tasks, progress percentages or successful tests.
