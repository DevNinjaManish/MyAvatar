import numpy as np

MIN_SAMPLES = 1600
MIN_RMS = 0.001
_TRANSIENT_ERRORS = (RuntimeError, OSError, TimeoutError)


def _pcm_array(pcm):
    if not isinstance(pcm, (bytes, bytearray, memoryview)):
        return None
    raw = bytes(pcm)
    if len(raw) < MIN_SAMPLES * 4 or len(raw) % 4:
        return None
    audio = np.frombuffer(raw, dtype='<f4').copy()
    if audio.size < MIN_SAMPLES:
        return None
    if not np.isfinite(audio).all():
        np.nan_to_num(audio, copy=False, nan=0.0, posinf=1.0, neginf=-1.0)
    np.clip(audio, -1.0, 1.0, out=audio)
    rms = float(np.sqrt(np.mean(audio.astype(np.float64) ** 2)))
    return audio if np.isfinite(rms) and rms >= MIN_RMS else None


def _run_whisper(audio, config):
    import mlx_whisper
    return mlx_whisper.transcribe(
        audio,
        path_or_hf_repo=config['model'],
        language=config['language'],
        fp16=True,
        condition_on_previous_text=False,
    )


def transcribe(pcm, config):
    audio = _pcm_array(pcm)
    if audio is None:
        return ''
    try:
        result = _run_whisper(audio, config)
    except _TRANSIENT_ERRORS:
        # MLX occasionally surfaces a one-off runtime/device failure while the
        # local model is settling. Retry exactly once; persistent failures still
        # propagate so readiness can degrade truthfully instead of looping.
        result = _run_whisper(audio, config)
    if not isinstance(result, dict):
        return ''
    return str(result.get('text') or '').strip()
