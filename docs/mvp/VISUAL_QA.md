# MVP Visual QA

UI changes are not complete until the native Electron widget has been launched and visually checked in the states below.

## Mandatory rule

Run this visual QA workflow after every UI, CSS, layout, interaction, or native-window change—even a small styling adjustment. Do not defer it to the end of a milestone.

## Required review states

1. Closed / Ready — transparent surroundings, complete companion, control card, no clipping.
2. Chat open / empty — native window expands to the open-chat height; companion keeps its position and scale; chat panel is fully visible.
3. Chat open / focused — message field has focus and the focus ring is visible.
4. Companion picker — picker is readable, selected companion state is clear, and the avatar/card do not unexpectedly reflow.
5. Narrow recovery state — unavailable or error copy remains readable and does not overflow the widget.
6. Optional surfaces hidden — no empty notice, banner, border, gap, or placeholder remains when no message is active.
7. Status banner — concise text stays on one line or within two lines, sits below the platform and above chat, uses companion accent for normal updates, and uses amber only for warnings/recovery.
8. Expanded chat — the larger transcript area, input, Send/Stop controls, bottom border, and bottom margin are all visible; nothing is clipped at the native window edge.

## Geometry assertions

- Closed state: the status banner’s bottom edge must remain inside the 470px native window, including the widget’s 10px outer padding.
- Open state: the banner must remain above chat, and the chat panel’s bottom edge must remain inside the expanded native window with visible bottom margin.
- Verify these bounds from the rendered element rectangles as well as from a screenshot; a screenshot alone can hide a one-pixel overflow.

## Interaction checks

- Open and close chat; confirm the window grows and restores without moving the companion.
- Trigger a normal update and a warning update; confirm banner placement, semantic color, and concise copy.
- Type into the message field; confirm focus, wrapping, and controls remain usable.
- Open and close the companion picker; select another companion and confirm artwork, name, and accent agree.
- Drag the widget; confirm the whole window moves and hit targets remain aligned.
- Relaunch once; confirm exactly one widget appears.

## Review method

Use the native Electron app, not only a browser preview. After each visual change:

1. Build or hot-reload the app.
2. Capture the required states with the desktop UI inspector.
3. Compare against the approved reference in [`DESIGN_REFERENCE.md`](design/DESIGN_REFERENCE.md) and the wireframes.
4. Fix layout regressions before moving to the next feature.

The visual reference is the source of truth for geometry and hierarchy; accessibility state is the source of truth for interaction availability and labels.
