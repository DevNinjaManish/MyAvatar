"""Portable local Faster-Whisper recognizer, retained between utterances."""
import json
import sys
import time
from collections import Counter
from faster_whisper import WhisperModel

model = WhisperModel(sys.argv[1], device='cpu', compute_type='int8', cpu_threads=4)
print(json.dumps({'ready':True}),flush=True)
for line in sys.stdin:
    request = json.loads(line)
    started = time.monotonic()
    try:
        generated, info = model.transcribe(
            request['path'], language=request.get('language'), beam_size=3,
            temperature=0, condition_on_previous_text=False,
            initial_prompt='Nova, Sterling, Rivit, Luma, MyAvatar.',
        )
        segments = list(generated)
        text = ''.join(part.text for part in segments).strip()
        words = text.split()
        uncertain = not text or (bool(segments) and all(
            part.avg_logprob < -1 or part.no_speech_prob > .6 for part in segments))
        uncertain = uncertain or (len(words)>8 and max(Counter(words).values(),default=0)/len(words)>.35)
        uncertain = uncertain or any(part.compression_ratio>2.4 for part in segments)
        response={'id':request['id'],'text':text,'uncertain':uncertain,
                  'language':info.language,'durationMs':round((time.monotonic()-started)*1000)}
    except Exception as error:
        response={'id':request['id'],'error':str(error)}
    print(json.dumps(response),flush=True)
