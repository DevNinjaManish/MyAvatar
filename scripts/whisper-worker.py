"""Portable local Faster-Whisper recognizer, retained between utterances."""
import json
import sys
import time
from collections import Counter
from faster_whisper import WhisperModel

HINDI_REPAIRS = (
    ('कल सुबहम', 'कल सुबह'),
    ('कल सुबहम्', 'कल सुबह'),
    ('आपनी बाई को', 'अपने भाई को'),
    ('आपने बाई को', 'अपने भाई को'),
    ('अपनी बाई को', 'अपने भाई को'),
    ('पून करना', 'फोन करना'),
    ('याज दिलाना', 'याद दिलाना'),
)

def normalize_transcript(text):
    repaired = ' '.join(text.split())
    for heard, intended in HINDI_REPAIRS:
        repaired = repaired.replace(heard, intended)
    return repaired

model = WhisperModel(sys.argv[1], device='cpu', compute_type='int8', cpu_threads=4)
print(json.dumps({'ready':True}),flush=True)
for line in sys.stdin:
    request = json.loads(line)
    started = time.monotonic()
    try:
        generated, info = model.transcribe(
            request['path'], language=request.get('language'), beam_size=1,
            temperature=0, condition_on_previous_text=False,
            vad_filter=True,
            vad_parameters={'min_silence_duration_ms': 180, 'speech_pad_ms': 120},
            initial_prompt=(
                'Nova, Sterling, Rivit, Luma, MyAvatar. Natural Hindi and English '
                'conversation may be mixed in one sentence. नमस्ते, कैसे हो, '
                'क्या, मुझे, आज, कल, remind me, can you hear me.'
            ),
        )
        segments = list(generated)
        raw_text = ''.join(part.text for part in segments).strip()
        text = normalize_transcript(raw_text)
        words = text.split()
        uncertain = not text or (bool(segments) and all(
            part.avg_logprob < -1 or part.no_speech_prob > .6 for part in segments))
        uncertain = uncertain or (len(words)>8 and max(Counter(words).values(),default=0)/len(words)>.35)
        uncertain = uncertain or any(part.compression_ratio>2.4 for part in segments)
        uncertain = uncertain or raw_text.count('एन ') >= 2
        response={'id':request['id'],'text':text,'rawText':raw_text,'uncertain':uncertain,
                  'language':info.language,'durationMs':round((time.monotonic()-started)*1000)}
    except Exception as error:
        response={'id':request['id'],'error':str(error)}
    print(json.dumps(response),flush=True)
