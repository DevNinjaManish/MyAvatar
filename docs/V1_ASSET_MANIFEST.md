# MyAvatar V1 asset manifest

This manifest separates current runtime assets, approved design references, and
future production assets so concept art is never mistaken for an animation-ready
deliverable.

## Current runtime identity assets

Each bot currently has `portrait.png` and `bust.png` under
`public/assets/bots/<bot>/`. These remain the canonical runtime identity sources
until a layered replacement passes visual and performance QA.

## Approved design references

- `docs/design-references/v1-companion-state-reference.png`: Ready, Listening,
  Thinking, Speaking, and recoverable Error; rows are Nova, Sterling, Rivit,
  and Luma.
- `docs/design-references/v1-companion-extended-states.png`: Working, Sleeping,
  and Recovery in the same row order.
- `docs/design-mockups/v1-core-surfaces.html`: exact UI design reference.
- `docs/design-mockups/v1-core-surfaces.png`: stable visual QA capture.

## Production companion slots

Every future layered companion package must provide the same named slots:

| Slot | Purpose |
| --- | --- |
| `base` | Stable bust silhouette and material identity |
| `eyes` | Gaze, blink, sleep, focus, and error expression |
| `mouth-primary` / `mouth-secondary` | Audio-reactive speaking channels |
| `accent-left` / `accent-right` | State and emotion lighting |
| `foreground` | Hands, tools, or authored overlap where applicable |
| `shadow` | Stable grounding independent of expression avatar crop |
| `effects` | Optional bounded work, recovery, or error treatment |

Required state fixtures are `ready`, `listening`, `understanding`, `speaking`,
`working`, `sleeping`, `paused`, `error`, and `recovery`. Fast mode may omit
`foreground` and `effects`; reduced motion must retain eyes, mouth amplitude,
and status-light clarity without continuous translation or rotation.

## Acceptance rules

- Transparent assets have clean alpha with no baked circle or checkerboard.
- State changes preserve crop, anchor point, silhouette, and widget geometry.
- Each bot remains recognizable in grayscale and without its name label.
- Assets pass compact and expanded layouts at 1× and 2× display scale.
- Runtime memory and frame time stay inside the Fast and Balanced budgets.
