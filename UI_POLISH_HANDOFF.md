# UI polish and next-phase handoff

Updated 2026-09-09. The maintainer explicitly requested that the accumulated work from PR #1 (`ui/widget-cockpit-v1`) and the engine roadmap be committed and merged into `main`. This supersedes the former 'do not merge yet' instruction. Check current repository state, then branch from the integrated `main` for follow-up changes; do not recreate or lose the existing UI work.

## Current direction

Read [ENGINE_IMPROVEMENT_PLAN.md](ENGINE_IMPROVEMENT_PLAN.md) first for the approved next milestone and [ROADMAP.md](ROADMAP.md) for its checklist. Read [UI_COCKPIT_PLAN.md](UI_COCKPIT_PLAN.md) for the attached-panel implementation.

The scope has expanded from presentation-only polishing to planning a dependable runtime: startup, greetings, listening, speech, chat, safe agent foundations and animation lifecycle. These engines are not implemented by this documentation update. Begin future implementation with runtime/configuration regression coverage, then startup and greetings. Keep changes in small focused PRs rather than rewriting every engine at once.

Work that needs the maintainer's Mac is still deferred. Do not require a live Mac check after every pure-logic/UI iteration. Engine simulations, recorded fixtures, state tests and isolated UI work can proceed. Native permission changes, real microphone/speaker tuning, final voice selection, Mac actions and hardware measurements need explicit later validation. Integration into main does not certify a release.

## Locked visual and interaction constraints

Keep the existing floating bust, restrained cockpit, four controls (Mic, Chat, Tools, More), one large bot and attached expandable/collapsible panels. Preserve original assets and the real mouth-speaker equaliser. Rivet is weathered teal/orange; Luma white/cyan; Nova rose; Sterling navy/gold; Pixel pink/lime. No renamed bots, full bodies, pinning, replacement artwork or decorative waveform replacing speech hardware.

The UI must stay truthful while engines are developed. Display actual readiness, queued tasks, approvals and results only when connected. Never fabricate test passes, progress percentages, inspected Git state or specialist activity.

## Implemented polish at bc40c4f

- Widget-scoped typography, spacing, readable disabled controls, restrained active states and focus rings; no new animations/dependencies/renderers.
- Existing native compact-column dimensions and all four controls; mic remains available alongside contextual Stop.
- Up/Down/Home/End panel-header navigation without hijacking editing keys.
- Collapse all disables appropriately; closing a wide view restores usable focus even after the source panel collapsed.
- Discuss in chat protects an existing unsent draft, explains conflicts and rejects overlong text; it never submits or starts a job.
- Folder selection has pending/busy, cancellation/error and disposal handling. Its display-name-only contract is unchanged and grants no file/command authority.
- Files and Diff have distinct honest empty states; task labels follow actual draft content.

## Validation record and remaining work

The polish pass reported 14 targeted tests and `node --check src/widget/panels.js` passing, plus 37 isolated Chromium checks. That fixture used the real controller/widget styles, reduced source-derived base CSS, inlined local modules, static uploaded Rivet art and mocked desktop/voice handlers. It was not the full application, live Electron, voice or mouth-animation validation.

The prior panel pass reported 40 panel/native-mock tests and 25 shell checks; these are documented separately in the cockpit plan. GitHub Actions subsequently verified JavaScript tests, Python tests and production build on `bc40c4f` ([run](https://github.com/DevNinjaManish/MyAvatar/actions/runs/34356589056)). Historical fixture counts are not new measurements of the engine roadmap.

Native appearance/dragging/focus, monitor transitions, all five live bots, mouth equalisation, permissions, microphone/TTS, echo and hardware performance are still unverified in these handoff runs. Finish the deferred checklist in the engine plan before release qualification; do not claim the merge itself completed it.

## Optional parallel UI-only work

Refine companion-picker/More-menu density, keyboard help, recovery/empty-state layouts and narrow file/diff readability without changing native window contracts. Align new readiness/chat/approval views with real engine events as those implementations land. Do not add working execution, telemetry or delegation controls before their backends exist.
