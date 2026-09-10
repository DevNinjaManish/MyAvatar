# Animation + Presence Intelligence — Batch 1

## Shared dual speaker equalisers

All five built-in bots now use the same dual-channel speech visualisation contract. The visual is driven by the real playback amplitude supplied by the audio analyser. Both left and right equaliser channels remain dark in idle, listening, and thinking states and immediately settle when audible playback ends.

The previous single-channel grille animation is suppressed only while audible speech is active; the existing illustrated hardware, diagnostic lights, eye effects, and bot-specific artwork remain unchanged.

Reduced-motion mode keeps a static amplitude indication while removing phase animation, so speech remains visibly indicated without decorative motion.

## Presence transitions

State transition timing is now explicit rather than using one fixed duration. Speaking enters fastest, listening follows quickly, thinking is more deliberate, and idle settles most gently. Motion intensity is also state-aware, keeping idle calmer while preserving each bot's existing personality motion.

## Safety / scope

This batch changes only avatar presentation. It does not alter model routing, Rivet coding authority, microphone permissions, tool approvals, persistent memory, or bot prompts.
