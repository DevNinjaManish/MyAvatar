# MVP acceptance checklist

The MVP is not ready when individual features work in isolation. It is ready when the complete loop is reliable on a clean supported Mac setup.

## Launch and shell

- [x] `npm start` starts the frontend and exactly one Electron widget.
- [x] The visible product is compact and widget-only.
- [x] The window opens within the work area and can be moved without losing its hit targets.
- [x] Relaunching does not create a duplicate widget.
- [x] Closing the widget shuts down its connection and optional media resources.

## Companion selection

- [x] Picker opens and closes from the visible control.
- [x] Each approved companion can be selected with mouse and keyboard.
- [x] Name, portrait, accent, accessibility label, and conversation identity agree after selection.
- [x] Switching companion clears or isolates the previous conversation according to the approved wireframe.

## Typed conversation

- [x] Chat opens from the widget control and visibly changes its native layout.
- [x] Textarea receives focus and supports a short message.
- [x] Send disables or indicates progress while a request is active.
- [x] A response renders as readable text without raw protocol data or markup leakage.
- [x] Stop interrupts an active response and returns the shell to a truthful idle state.
- [x] Clear removes the visible transcript only after the user invokes it.
- [x] Closing and reopening chat preserves the intended transcript behavior from the wireframe.

## Voice conversation

- [x] Mic permission is requested only after an explicit user action.
- [x] Listening is visibly distinct from thinking and speaking.
- [x] A spoken turn is bounded, transcribed locally, and submitted once.
- [x] The response appears as text and plays through local speech output.
- [x] Stop ends listening or speaking without leaving microphone or playback resources active.
- [x] Microphone denial, recognition failure, and speech-output failure leave typed chat usable.
- [x] Voice focus and controls remain keyboard accessible and match the audio wireframe.

## Recovery and boundaries

- [x] Backend unavailable, model unavailable, microphone denied, and request failure each have a clear state.
- [x] Retry is bounded and cannot create duplicate sockets or duplicate turns.
- [x] No MVP control opens a full-screen surface.
- [x] No out-of-scope specialist, coding, calendar, or agent surface is reachable from the MVP shell.

## Quality gates

- [x] Wireframes are approved before implementation of the corresponding surface.
- [x] Design mockup is the visual reference for screenshot comparison.
- [x] JavaScript tests pass.
- [x] Production build passes.
- [x] Native smoke checklist passes on the supported Mac hardware.
- [x] Known limitations and setup requirements are documented.

Verification: 2026-09-12 — Clean temporary checkout passed `npm ci`, build, 68 tests, and doctor. Native QA covered launch/relaunch, closed and alert-height banner states, companion picker and keyboard navigation, real typed conversation, focused chat, expanded-chat containment, and voice Listening/Stop interaction. The build reports only a non-blocking Vite bundle-size warning; voice setup requires the locally installed Whisper CLI and macOS `say`.
