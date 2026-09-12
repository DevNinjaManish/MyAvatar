import base64
import io
import sys
import wave

import numpy as np
from kokoro_onnx import Kokoro, SAMPLE_RATE


def main():
    if len(sys.argv) != 7:
        raise SystemExit('usage: kokoro-tts.py MODEL VOICES VOICE SPEED LANG TEXT')
    model_path, voices_path, voice, speed, lang, text = sys.argv[1:]
    kokoro=Kokoro(model_path, voices_path)
    phonemes=kokoro.tokenizer.phonemize(text, lang)
    parts=[]
    voice_style=kokoro.get_voice_style(voice)
    for batch in kokoro._split_phonemes(phonemes):
        tokens=kokoro.tokenizer.tokenize(batch)
        style=voice_style[len(tokens)]
        inputs={
            'input_ids':np.array([[0,*tokens,0]],dtype=np.int64),
            'style':np.array(style,dtype=np.float32),
            # kokoro-onnx 0.4.9 passes int32 here, but this checked-in model
            # expects the newer float input contract.
            'speed':np.array([float(speed)],dtype=np.float32),
        }
        parts.append(kokoro.sess.run(None,inputs)[0])
    samples=np.concatenate(parts) if parts else np.zeros(0,dtype=np.float32)
    sample_rate=SAMPLE_RATE
    pcm=(np.clip(samples,-1,1)*32767).astype(np.int16).tobytes()
    output=io.BytesIO()
    with wave.open(output,'wb') as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(sample_rate)
        stream.writeframes(pcm)
    print(base64.b64encode(output.getvalue()).decode('ascii'))


if __name__=='__main__':
    main()
