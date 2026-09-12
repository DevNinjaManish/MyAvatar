"""Portable local Faster-Whisper recognizer, retained between utterances."""
import json
import os
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
    ('आपनी बहाई को', 'अपने भाई को'),
    ('पून करना', 'फोन करना'),
    ('याज दिलाना', 'याद दिलाना'),
)

def normalize_transcript(text):
    repaired = ' '.join(text.split())
    for heard, intended in HINDI_REPAIRS:
        repaired = repaired.replace(heard, intended)
    return repaired

model = WhisperModel(sys.argv[1], device='cpu', compute_type='int8', cpu_threads=4)
BEAM_SIZE = max(1, int(os.environ.get('MYAVATAR_WHISPER_BEAM_SIZE', '2')))

def decode(path, language=None, beam_size=BEAM_SIZE, prompt=None):
    generated, info = model.transcribe(
        path, language=language, beam_size=beam_size,
        temperature=0, condition_on_previous_text=False,
        # Browser endpointing already removes most silence. Leave a more
        # forgiving margin here so quiet English word endings are not cut off.
        vad_filter=True,
        vad_parameters={'min_silence_duration_ms': 300, 'speech_pad_ms': 200},
        initial_prompt=prompt or (
            'Nova, Sterling, Rivit, Luma, MyAvatar. Natural Hindi and English '
            'conversation may be mixed in one sentence. Preserve English names, '
            'numbers, and word endings; do not translate English into Hindi. '
            'नमस्ते, कैसे हो, क्या, मुझे, आज, कल, remind me, can you hear me.'
        ),
    )
    segments = list(generated)
    raw_text = ''.join(part.text for part in segments).strip()
    score=sum(part.avg_logprob for part in segments)/max(1,len(segments))
    return segments, info, raw_text, score

print(json.dumps({'ready':True}),flush=True)
for line in sys.stdin:
    request = json.loads(line)
    started = time.monotonic()
    try:
        requested_language=request.get('language')
        segments, info, raw_text, score = decode(request['path'], requested_language)
        rescued_english=False
        # Do not make every turn pay for a larger beam. When automatic language
        # detection identifies English but the first pass is weak, retry with a
        # fixed English decoder and retain the more confident result.
        weak_english=(requested_language is None and info.language=='en' and
            (score < -.45 or any(part.no_speech_prob > .35 for part in segments)))
        if weak_english:
            retry_segments, retry_info, retry_text, retry_score = decode(
                request['path'], 'en', max(3,BEAM_SIZE+1),
                'Natural conversational English. Preserve names, numbers, and word endings.'
            )
            if retry_text and retry_score >= score:
                segments, info, raw_text, score = retry_segments, retry_info, retry_text, retry_score
                rescued_english=True
        text = normalize_transcript(raw_text)
        words = text.split()
        uncertain = not text or (bool(segments) and all(
            part.avg_logprob < -1 or part.no_speech_prob > .6 for part in segments))
        uncertain = uncertain or (len(words)>8 and max(Counter(words).values(),default=0)/len(words)>.35)
        uncertain = uncertain or any(part.compression_ratio>2.4 for part in segments)
        uncertain = uncertain or raw_text.count('एन ') >= 2
        response={'id':request['id'],'text':text,'rawText':raw_text,'uncertain':uncertain,
                  'language':info.language,'rescuedEnglish':rescued_english,
                  'durationMs':round((time.monotonic()-started)*1000)}
    except Exception as error:
        response={'id':request['id'],'error':str(error)}
    print(json.dumps(response),flush=True)
