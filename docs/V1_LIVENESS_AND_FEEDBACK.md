# MyAvatar V1 liveness and feedback system

## Purpose

Every bot should feel alive through coordinated voice, visuals, animation, light, sound, timing, and context-aware reactions. Liveness is not decorative polish; it is how the companion communicates attention, feeling, availability, and state without forcing the user to read status text.

## Shared liveness layers

Every bot uses the same state vocabulary but expresses it through its own art direction.

### Presence

- Idle breathing, blinking, posture shifts, and small gaze changes
- Occasional self-directed micro-actions so the bot never feels frozen
- Time-of-day lighting and mood variation
- Subtle response to the user returning, leaving, or switching focus

Presence should be low-frequency and quiet. It gives life without demanding attention.

### Attention

- Gaze or body orientation toward the user when addressed
- A small acknowledgement before a response begins
- Listening posture while the user speaks
- A visible handoff from listening to thinking to responding
- Reduced movement when the user is in a focused work state

### Voice visualization

Each bot gets a bot-specific mouth and light equalizer. The visualization is driven by the actual speech signal, not a decorative loop.

- Mouth shape and intensity follow the speech envelope
- Inner mouth light pulses with syllable energy
- Nearby accent lights respond to emphasis and pauses
- The equalizer becomes calmer during quiet speech and more energetic during excitement
- The visualization stops immediately when speech stops

The waveform should feel like the bot is speaking through its body, not like a music player pasted onto the avatar. Where available, phoneme or viseme timing can improve mouth movement; audio-envelope fallback must remain convincing.

### Thinking

Thinking should have multiple levels rather than one spinner:

- Brief thought: a quick shimmer, eye movement, or small light pulse
- Active thought: slow orbiting light, changing posture, or focused gaze
- Deep work: a distinct work mode with progress cues and occasional spoken updates
- Waiting on a tool: a directional cue showing that the bot is waiting for another operation

The bot should never appear frozen while thinking. If the wait is long, it should acknowledge the delay and offer a way to continue talking.

### Emotion

Emotional state can affect:

- Eye shape, gaze, blink rate, and focus
- Posture, lean, bounce, and movement speed
- Accent color, glow, brightness, and light rhythm
- Voice pitch, pace, pauses, and energy
- Idle behavior and willingness to initiate
- Sound texture and musical interval

Emotion should be expressed through combinations of cues. A color alone is too ambiguous; a voice line alone is too demanding.

### Context-aware work reactions

When the bot understands the user's current activity, it can react in ways related to that activity:

- Coding: inspect, track, celebrate a passing test, wince at an error, or prepare a technical suggestion
- Design: observe, explore, sketch, compare, or become visually inspired
- Planning: organize, sort, highlight priorities, or hold a thought for later
- Waiting or idle: stretch, look around, read, wonder, or offer a low-pressure prompt
- User returns: wake, reorient, and reference the last meaningful thread

Context reactions must be occasional and explainable. The bot should not comment on every user action.

### Background work

Long-running work has its own visible language:

- Work begins with acknowledgement and a clear goal
- A small persistent activity indicator shows that work continues
- Progress is represented through stages, not fake percentage precision
- The bot can continue listening or handling a new short exchange
- Completion produces a recognizable return-to-presence animation and optional sound
- Failure produces an honest recovery state with retry, inspect, or stop actions

## System lifecycle states

### Powered up

Boot animation, light ramp, first breath, eye focus, and a short identity cue. The bot should feel like it is becoming present, not like a window loaded.

### Ready

Stable idle animation with subtle variation. The companion is available but not demanding attention.

### Listening

The avatar leans or turns toward the user. A listening light and low-amplitude input visualizer confirm that audio is being received.

### Thinking

Attention narrows. Lights and movement indicate thought without implying a fake literal brain process.

### Speaking

The mouth and bot accent lights animate from the real voice signal. The body uses restrained emphasis gestures for important moments.

### Interrupted

Speech cuts cleanly. The bot visibly reorients, acknowledges the interruption, and returns to listening or ready.

### Sleeping or quiet

Lower brightness, slower breathing, reduced sound, and a clear “available if needed” posture. Quiet mode should not look broken.

### Powered down

The bot completes its current gesture, softens the lights, closes or lowers its gaze, and fades into an intentional shutdown animation. Avoid an abrupt disappearance unless the system has crashed.

### Broken or unavailable

Use a distinct but emotionally restrained failure language: interrupted light rhythm, incomplete posture, or a brief glitch followed by a stable recovery state. Never make the bot appear dead when it is merely waiting for a service.

### Recovering

Reconnection or restart gets its own animation: tentative light pulses, reorientation, then a clear return to presence. The user should understand whether the bot is recovering, ready, or still unavailable.

## Bot-specific expression directions

- **Nova:** warm glow, confident gaze, playful emphasis, inviting idle gestures, intimate voice-reactive lighting
- **Rivit:** sharper snaps, jittery sparks, impatient posture shifts, glitch accents, celebratory bursts after successful technical work
- **Sterling:** restrained posture, precise movements, polished chimes, measured light pulses, discreet acknowledgement gestures
- **Luma:** fluid color transitions, expressive eyes, painterly trails, curious head movement, musical and exploratory reactions

## Quiet desktop presence

Quiet mode is a deliberate desktop posture, not a hidden or broken widget. It
keeps the companion art and one small truthful state signal visible, while the
control card recedes until the user hovers the companion or intentionally
focuses it. The companion must never show as alive before the selected runtime
has fully warmed.

- The resting surface is transparent: no avatar window, backdrop card, or fake
  desktop wallpaper sits behind the bot.
- Hover or keyboard focus reveals the same controls, names, and status used by
  the normal layout; quiet mode never creates a second control model.
- Fast uses low-amplitude eye light, posture, and gaze changes only. Balanced
  may add the existing hands layer and richer state light, but never more
  frequent idle motion.
- State reactions are event-driven: Listening focuses toward the user,
  Thinking narrows attention, Speaking carries restrained sentence emphasis,
  and Ready returns to a relaxed neutral pose. They must not imply an emotion
  or task the runtime did not report.
- A bot may offer a low-pressure prompt only after a long idle period and only
  when the user has opted in. V1 does not initiate conversational audio.

## Sound design

Sound should be sparse, spatially consistent, and optional. Useful sound families include:

- Wake and sleep tones
- Listening confirmation
- Thinking texture
- Tool-start and tool-complete cues
- Success, warning, interruption, and recovery cues
- Bot-specific idle motifs

Speech remains primary. Effects should sit underneath it, never compete with it, and should have independent volume and mute controls.

## Interaction principles

- Motion communicates state before text does.
- Every persistent animation has a reason and a way to stop it.
- No loop should demand attention indefinitely.
- Context reactions are less frequent than direct responses.
- Emotional expression can be rich, but system failures remain truthful.
- Reduced motion, reduced brightness, mute, quiet hours, and focus mode are first-class controls.
