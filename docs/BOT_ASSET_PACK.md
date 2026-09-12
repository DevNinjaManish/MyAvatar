# MyAvatar bot asset pack

This is the single runtime asset contract for every bot. Release and milestone
labels never appear in asset filenames.

## Canonical bot asset pack

There is one runtime pack under `public/assets/bots/<bot>/`. Asset filenames do
not contain release, milestone, or draft suffixes. Git history preserves prior
artwork.

| File | Purpose |
| --- | --- |
| `portrait.png` | Canonical face artwork and coordinate-mapped live hardware |
| `body.png` | Canonical transparent upper-body layer |
| `hands.png` | Optional transparent foreground gesture layer |

Every current bot ships all three files. `hands.png` remains optional in the
loader so a future character can launch safely before authored gestures exist.

## Runtime behavior

- `portrait.png` is the only layer repainted for eyes, blinking, presence
  lights, and speech equalizers. Those effects stay aligned to the illustrated
  hardware rather than becoming generic face animation.
- `body.png` provides stable transparent shoulder and torso depth.
- `hands.png` is hidden while idle, thinking, working, paused, sleeping,
  recovering, or in error. Balanced mode fades it in below the face for
  listening and speaking. Fast and reduced-motion modes omit it.
- Hands never control readiness. The bot remains visually inactive until the
  selected voice and conversation stack has finished warming.

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
| `base` | Stable body silhouette and material identity |
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
