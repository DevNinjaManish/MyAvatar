# MVP acceptance checklist

The MVP is not ready when individual features work in isolation. It is ready when the complete loop is reliable on a clean supported Mac setup.

## Launch and shell

- [ ] `npm start` starts the frontend and exactly one Electron widget.
- [ ] The visible product is compact and widget-only.
- [ ] The window opens within the work area and can be moved without losing its hit targets.
- [ ] Relaunching does not create a duplicate widget.
- [ ] Closing the widget shuts down its connection and optional media resources.

## Companion selection

- [ ] Picker opens and closes from the visible control.
- [ ] Each approved companion can be selected with mouse and keyboard.
- [ ] Name, portrait, accent, accessibility label, and conversation identity agree after selection.
- [ ] Switching companion clears or isolates the previous conversation according to the approved wireframe.

## Typed conversation

- [ ] Chat opens from the widget control and visibly changes its native layout.
- [ ] Textarea receives focus and supports a short message.
- [ ] Send disables or indicates progress while a request is active.
- [ ] A response renders as readable text without raw protocol data or markup leakage.
- [ ] Stop interrupts an active response and returns the shell to a truthful idle state.
- [ ] Clear removes the visible transcript only after the user invokes it.
- [ ] Closing and reopening chat preserves the intended transcript behavior from the wireframe.

## Voice conversation

- [ ] Mic permission is requested only after an explicit user action.
- [ ] Listening is visibly distinct from thinking and speaking.
- [ ] A spoken turn is bounded, transcribed locally, and submitted once.
- [ ] The response appears as text and plays through local speech output.
- [ ] Stop ends listening or speaking without leaving microphone or playback resources active.
- [ ] Microphone denial, recognition failure, and speech-output failure leave typed chat usable.
- [ ] Voice focus and controls remain keyboard accessible and match the audio wireframe.

## Recovery and boundaries

- [ ] Backend unavailable, model unavailable, microphone denied, and request failure each have a clear state.
- [ ] Retry is bounded and cannot create duplicate sockets or duplicate turns.
- [ ] No MVP control opens a full-screen surface.
- [ ] No out-of-scope specialist, coding, calendar, or agent surface is reachable from the MVP shell.

## Quality gates

- [ ] Wireframes are approved before implementation of the corresponding surface.
- [ ] Design mockup is the visual reference for screenshot comparison.
- [ ] JavaScript tests pass.
- [ ] Production build passes.
- [ ] Native smoke checklist passes on the supported Mac hardware.
- [ ] Known limitations and setup requirements are documented.
