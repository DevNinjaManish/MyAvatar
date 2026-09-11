# V1 Wireframe 02 — Voice and liveness states

Purpose: define how voice, animation, lighting, sound, and state communicate a natural live companion.

## State strip

```text
READY       LISTENING       THINKING       SPEAKING       WORKING
  ◌             ◉              ✦              ≋              ···
 calm idle    input pulse    thought cue   mouth/light    specialist cue
```

The state strip is a small supporting cue. The bot artwork remains the primary expression surface.

## Listening

```text
┌──────────────────────────────┐
│  Nova                 ● LISTENING
│                              │
│       face toward user      │
│      eyes attentive          │
│       [input ▁▃▅▃▁]          │
│                              │
│  [Stop]  “I’m listening…”    │
└──────────────────────────────┘
```

Rules:

- Mic control becomes Stop.
- Input visualizer reflects microphone input, not output speech.
- Mouth remains still except for authored backchannels.
- Listening timeout is explained and recoverable.

## Thinking

```text
┌──────────────────────────────┐
│  Nova                 ✦ THINKING
│                              │
│       focused gaze           │
│      slow light orbit        │
│                              │
│  “Let me think about that…”  │
│  [Interrupt] [Keep talking]  │
└──────────────────────────────┘
```

Rules:

- Short thinking uses a brief visual cue.
- Longer thinking uses truthful filler and remains interruptible.
- The user can continue a separate short exchange where supported.
- No indefinite spinner or fake percentage.

## Speaking

```text
┌──────────────────────────────┐
│  Nova                 ≋ SPEAKING
│                              │
│       mouth waveform         │
│   accent lights pulse        │
│   [audio ▁▅▂▇▃▆▁]            │
│                              │
│  [Interrupt]                 │
└──────────────────────────────┘
```

Rules:

- Mouth and light animation are driven by actual output audio.
- Nonverbal sounds occupy the same output timeline.
- Interrupt immediately stops speech and returns to Listening or Ready.
- Visual intensity follows bot emotion and speech energy.

## Background work

```text
┌──────────────────────────────┐
│  Nova                  ● WORKING
│  [Rivit] checking project     │
│  ────────────────            │
│  Voice remains available      │
│  [View] [Stop]                │
└──────────────────────────────┘
```

Rules:

- Work status is visible but compact.
- The avatar continues low-frequency presence animation.
- Voice and chat do not freeze.
- Completion, question, permission, and failure each have distinct cues.

## Lifecycle cues

- **Powered up:** light ramp, first breath, focus, identity cue
- **Ready:** calm breathing, blinking, subtle idle variation
- **Sleeping:** dimmed light, slower motion, quiet sound
- **Powered down:** intentional fade, lowered gaze, final breath or tone
- **Broken:** restrained glitch or interrupted rhythm, honest status text
- **Recovering:** tentative pulses, reorientation, return-to-ready cue

## Bot expression parameters

Every bot controls the same state events through its own parameters:

- Motion speed
- Idle frequency
- Light palette and pulse rhythm
- Eye/gaze behavior
- Mouth/face response
- Sound palette
- Emotional intensity
- Work-state style

## QA captures

Capture each state with each V1 bot in Fast and Balanced visual profiles, including speech visualization, interruption, muted sound, reduced motion, background work, failure, and recovery.
