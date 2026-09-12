"""Apple Silicon MLX Whisper recognizer, retained and warmed between utterances."""
import json
import sys
import time
from collections import Counter

import mlx_whisper
import numpy as np


HINDI_REPAIRS = (
    ('कल सुबहम', 'कल सुबह'),
    ('कल सुबहम्', 'कल सुबह'),
    ('आपनी बाई को', 'अपने भाई को'),
    ('आपने बाई को', 'अपने भाई को'),
    ('अपनी बाई को', 'अपने भाई को'),
    ('आपनी बहाई को', 'अपने भाई को'),
    ('पून करना', 'फोन करना'),
    ('याज दिलाना', 'याद दिलाना'),
)

MULTILINGUAL_PROMPT = (
    'Nova, Sterling, Rivit, Luma, MyAvatar. Natural Hindi and English '
    'conversation may be mixed in one sentence. Preserve English names, '
    'numbers, and word endings; do not translate English into Hindi. '
    'नमस्ते, कैसे हो, क्या, मुझे, आज, कल, remind me, can you hear me.'
)


def normalize_transcript(text):
    repaired = ' '.join(text.split())
    for heard, intended in HINDI_REPAIRS:
        repaired = repaired.replace(heard, intended)
    return repaired


model = sys.argv[1]
english_only = '.en' in model.lower()


def decode(path, language=None):
    return mlx_whisper.transcribe(
        path,
        path_or_hf_repo=model,
        language='en' if english_only else language,
        temperature=0,
        condition_on_previous_text=False,
        initial_prompt=None if english_only else MULTILINGUAL_PROMPT,
        verbose=None,
    )


# Loading weights alone does not prove that Metal kernels are ready. Run one
# short inference before reporting readiness so the UI cannot present an alive
# companion while the first real utterance still pays model compilation cost.
mlx_whisper.transcribe(
    np.zeros(4000, dtype=np.float32),
    path_or_hf_repo=model,
    language='en' if english_only else None,
    temperature=0,
    condition_on_previous_text=False,
    verbose=None,
)
print(json.dumps({'ready': True}), flush=True)

for line in sys.stdin:
    request = json.loads(line)
    started = time.monotonic()
    try:
        result = decode(request['path'], request.get('language'))
        segments = result.get('segments', [])
        raw_text = result.get('text', '').strip()
        text = normalize_transcript(raw_text)
        words = text.split()
        uncertain = not text or (bool(segments) and all(
            part.get('avg_logprob', 0) < -1 or part.get('no_speech_prob', 0) > .6
            for part in segments
        ))
        uncertain = uncertain or (
            len(words) > 8
            and max(Counter(words).values(), default=0) / len(words) > .35
        )
        uncertain = uncertain or any(
            part.get('compression_ratio', 0) > 2.4 for part in segments
        )
        uncertain = uncertain or raw_text.count('एन ') >= 2
        response = {
            'id': request['id'],
            'text': text,
            'rawText': raw_text,
            'uncertain': uncertain,
            'language': result.get('language', request.get('language') or ''),
            'rescuedEnglish': False,
            'durationMs': round((time.monotonic() - started) * 1000),
        }
    except Exception as error:
        response = {'id': request['id'], 'error': str(error)}
    print(json.dumps(response), flush=True)
