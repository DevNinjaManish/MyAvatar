# MyAvatar V1 motion and behavior specification

This is the shared motion contract for the 2.5D companion. Bot-specific motion
may vary in rhythm and intensity, but state meaning and interruption behavior
remain consistent.

## State behavior

| State | Motion language | Exit condition |
| --- | --- | --- |
| Ready | Slow breathing, occasional blink, small idle variation | User input, proactive event, sleep/pause |
| Listening | Attention turn, gaze toward user, input pulse; mouth mostly still | Endpoint, stop, timeout, or failure |
| Thinking | Focused gaze and restrained orbit; truthful acknowledgement only for long work | First response, completion, interruption, or failure |
| Speaking | Mouth and lights follow actual output audio envelope | Audio completion or interruption |
| Working | Low-frequency presence plus compact job cue | Completion, question, permission, cancellation, or failure |
| Sleeping | Dimmed light and slow movement; no attention-grabbing pulse | Wake, user input, or scheduled event |
| Broken | Restrained disrupted rhythm with honest text | Recovery attempt or user dismissal |
| Recovering | Tentative pulse, reorientation, then explicit Ready | Runtime readiness or retry failure |

## Interruption rules

- User stop or barge-in immediately halts output audio and speaking motion.
- A cancelled turn cannot emit late tokens, audio, completion, or visual state changes.
- The companion returns to Listening when capture remains active, otherwise Ready.
- Reduced motion removes decorative phase animation but preserves audio amplitude,
  state labels, focus, and actionable controls.
- Muted audio preserves visual speech state and offers an explicit unmute path.

## QA timing fixtures

Every bot needs fixtures for: wake, ready idle, listening onset, thinking under
one second, extended thinking, speaking with pauses, barge-in, cancellation,
working banner, permission request, failure, recovery, sleep, and reduced
motion. Fixtures must use deterministic event timing and real audio envelopes
where audio-reactive behavior is claimed.
