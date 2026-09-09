import numpy as np

def transcribe(pcm, config):
    audio = np.frombuffer(pcm, dtype='<f4').copy()
    if len(audio) < 1600 or np.sqrt(np.mean(audio*audio)) < 0.001:
        return ''
    import mlx_whisper
    result = mlx_whisper.transcribe(audio, path_or_hf_repo=config['model'], language=config['language'], fp16=True, condition_on_previous_text=False)
    return result['text'].strip()
