# Voice Core Reliability — Batch 2

This batch focuses on conversational interruption and local speech recovery without adding cloud dependencies or a second speech model.

## Implemented

- Live microphone capture remains allocated while the bot speaks, but normal turn detection stays gated until the current response settles.
- While playback is active, a separate stricter barge-in detector may recognize sustained user speech and hand it to the existing interruption path.
- Barge-in has its own higher energy threshold, longer speech requirement, shorter end-of-turn window, and a 500 ms playback guard to reduce speaker/echo false triggers.
- Browser microphone capture continues to request echo cancellation, noise suppression, and automatic gain control.
- After playback completes, normal live listening resumes after 180 ms instead of 250 ms.
- Local MLX Whisper transcription retries exactly once for transient RuntimeError/OSError/TimeoutError failures. Persistent failures still propagate so engine readiness can degrade truthfully.
- Invalid/silent speech input still resolves as an empty transcript and follows the existing quiet completion path rather than manufacturing text.

## Safety and limits

The barge-in detector is deliberately conservative. Automated tests cannot prove echo rejection on a real Mac speaker/microphone combination, so thresholds should only be loosened after live hardware validation. The bot does not continuously transcribe while speaking; it only runs the lightweight local energy detector until interruption is likely.

## QA scope

Tests cover successful interruption after the speaker guard, rejection during the guard window, one-shot transient STT recovery, persistent STT failure, and non-transient failure behavior. Existing capture/VAD/playback tests remain part of the full CI gate.
