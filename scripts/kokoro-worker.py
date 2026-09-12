import base64
import io
import json
import sys
import wave

import numpy as np
from kokoro_onnx import Kokoro, SAMPLE_RATE


def synthesize(kokoro, text, voice, speed, lang, pause_ms=0):
    phonemes=kokoro.tokenizer.phonemize(text, lang)
    voice_style=kokoro.get_voice_style(voice)
    parts=[]
    for batch in kokoro._split_phonemes(phonemes):
        tokens=kokoro.tokenizer.tokenize(batch)
        inputs={
            'input_ids':np.array([[0,*tokens,0]],dtype=np.int64),
            'style':np.array(voice_style[len(tokens)],dtype=np.float32),
            'speed':np.array([float(speed)],dtype=np.float32),
        }
        parts.append(kokoro.sess.run(None,inputs)[0])
    samples=np.concatenate(parts) if parts else np.zeros(0,dtype=np.float32)
    if pause_ms:
        samples=np.concatenate([samples,np.zeros(round(SAMPLE_RATE*float(pause_ms)/1000),dtype=np.float32)])
    pcm=(np.clip(samples,-1,1)*32767).astype(np.int16).tobytes()
    output=io.BytesIO()
    with wave.open(output,'wb') as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(SAMPLE_RATE)
        stream.writeframes(pcm)
    return base64.b64encode(output.getvalue()).decode('ascii')


def main():
    if len(sys.argv)!=3:
        raise SystemExit('usage: kokoro-worker.py MODEL VOICES')
    kokoro=Kokoro(sys.argv[1],sys.argv[2])
    print(json.dumps({'ready': True}), flush=True)
    for line in sys.stdin:
        if not line.strip():
            continue
        request=json.loads(line)
        try:
            audio=synthesize(kokoro,request['text'],request['voice'],request['speed'],request['lang'],request.get('pauseMs',0))
            response={'id':request['id'],'audio':audio}
        except Exception as error:
            response={'id':request.get('id'),'error':str(error)}
        sys.stdout.write(json.dumps(response,separators=(',',':'))+'\n')
        sys.stdout.flush()


if __name__=='__main__':
    main()
