# V1 Wireframe 11 — Quiet desktop presence

Purpose: define the resting desktop companion and the single interaction that
reveals its controls. The bot stays a transparent presence on the desktop, not
a floating window.

## Resting state

```text
             [ Nova portrait ]
                    ·  Ready

     No stage background. No control card. No unsolicited speech.
```

Rules:

- The avatar and the state dot are the only visible UI at rest.
- The avatar is absent until the selected local recognizer, conversation model,
  and Kokoro have completed their warm-up.
- The dot carries a text alternative and uses the normal Ready, Listening,
  Thinking, Speaking, Working, Paused, and Unavailable states.
- Idle motion remains sparse: a small gaze or lighting variation, never a
  looping attention-seeking gesture.

## Hover or focused state

```text
             [ Nova portrait ]
                    ·  Ready

       ┌──────────────────────────┐
       │ Nova              ● Ready │
       │ [ Mic ] [ Chat ] [ Pause ]│
       │             [ More ]      │
       └──────────────────────────┘
```

Rules:

- Hover and keyboard focus reveal the existing control card; no duplicate
  compact controls are introduced.
- Leaving the companion returns to the resting state after a short visual
  transition, unless a panel is open, keyboard focus is inside the controls,
  or the companion is actively listening, speaking, or working.
- More exposes Performance, Appearance, Quiet desktop, Runtime health, Hide,
  and Quit in one compact sheet.

## Personality reaction map

| Runtime state | Shared cue | Nova | Sterling | Rivit | Luma |
| --- | --- | --- | --- | --- | --- |
| Ready | quiet gaze shift | warm eye light | measured focus | quick hardware tick | curious color drift |
| Listening | attention forward | inviting lean | precise orientation | alert snap | open, inquisitive gaze |
| Thinking | narrowed attention | soft internal glow | still, deliberate gaze | focused spark | slow exploratory sweep |
| Speaking | audio-driven emphasis | warm light pulse | restrained cadence | punchy accent | flowing response light |
| Working | truthful task cue | patient hold | discreet indicator | active technical cue | inspired exploration |

Fast uses only the shared cue and portrait lighting. Balanced may layer hands
and deeper light response. Both use the exact same state and never fabricate
progress or mood.
