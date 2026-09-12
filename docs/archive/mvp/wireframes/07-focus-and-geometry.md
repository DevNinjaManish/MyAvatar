# Wireframe 07 — Focus and geometry contract

The wireframes are also an interaction contract.

## Focus order

Closed widget: companion picker → Mic → Chat → More (if present) → avatar/drag handle.

Open chat: chat close → message actions if present → message field → Send → Chat close.

Picker: close → selected companion → remaining companions in visual order.

Recovery: Retry → close/quit.

## Geometry rules

- One compact right-side widget is the default surface.
- Chat expands vertically from the widget without moving the companion identity out of view.
- Picker and recovery surfaces remain bounded within the native window.
- No hidden surface may intercept pointer or keyboard input.
- Every visible control must have an enabled action or be clearly disabled with a reason.
