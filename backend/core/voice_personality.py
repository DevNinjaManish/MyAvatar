from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class VoicePersonality:
    speed_multiplier: float
    first_chunk_scale: float
    chunk_scale: float
    barge_guard_ms: int
    barge_onset_ms: int
    barge_min_speech_ms: int
    barge_silence_ms: int
    resume_delay_ms: int


VOICE_PERSONALITIES = {
    'nova': VoicePersonality(1.00, .92, .98, 360, 145, 250, 250, 120),
    'robot': VoicePersonality(.99, .96, .96, 460, 170, 300, 285, 140),
    'butler': VoicePersonality(.97, 1.06, 1.06, 520, 185, 320, 310, 165),
    'pixel': VoicePersonality(1.03, .86, .90, 330, 135, 240, 235, 105),
    'luma': VoicePersonality(.98, 1.02, 1.04, 470, 175, 300, 300, 155),
}


def voice_personality(bot_id: str) -> VoicePersonality:
    return VOICE_PERSONALITIES.get(bot_id, VOICE_PERSONALITIES['nova'])


def apply_voice_personality(*, bot_id: str, conversation: dict, tts: dict, audio: dict) -> None:
    """Apply small, bounded personality timing differences to shared engines.

    The provider/model choices remain untouched. These are presentation-level
    timing values only, keeping all bots on the same speech and VAD engines.
    """
    profile = voice_personality(bot_id)
    conversation['firstChunkChars'] = max(24, min(96, round(float(conversation.get('firstChunkChars', 48)) * profile.first_chunk_scale)))
    conversation['chunkChars'] = max(72, min(220, round(float(conversation.get('chunkChars', 128)) * profile.chunk_scale)))
    tts['persona'] = bot_id
    vad = audio.setdefault('vad', {})
    barge = vad.setdefault('bargeIn', {})
    barge.update(
        guardMs=profile.barge_guard_ms,
        onsetMs=profile.barge_onset_ms,
        minSpeechMs=profile.barge_min_speech_ms,
        silenceMs=profile.barge_silence_ms,
    )
    audio['resumeDelayMs'] = profile.resume_delay_ms
