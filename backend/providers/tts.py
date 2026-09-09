import io
import soundfile as sf
from pathlib import Path
import numpy as np

class Speech:
    def __init__(self):
        self.engine = None
        self.paths = None

    def generate(self, text, config):
        paths = (config['model'], config['voices'])
        if not all(Path(p).exists() for p in paths):
            raise RuntimeError('Kokoro weights missing. Run .venv/bin/python scripts/download_models.py')
        if self.paths != paths:
            from kokoro_onnx import Kokoro
            import onnxruntime as ort
            class CompatibleKokoro(Kokoro):
                # kokoro-onnx 0.4.9 assumes integer speed for input_ids exports.
                # The official v1.1 model-files graph requires float32 speed.
                def _create_audio(self, phonemes, voice, speed):
                    ids = self.tokenizer.tokenize(phonemes[:510])
                    types = {x.name:x.type for x in self.sess.get_inputs()}
                    key = 'input_ids' if 'input_ids' in types else 'tokens'
                    inputs = {key: np.array([[0,*ids,0]],dtype=np.int64),
                              'style':np.asarray(voice[len(ids)],dtype=np.float32),
                              'speed':np.array([speed],dtype=np.float32 if types['speed']=='tensor(float)' else np.int32)}
                    return self.sess.run(None,inputs)[0],24000
            options=ort.SessionOptions()
            options.intra_op_num_threads=4
            options.inter_op_num_threads=1
            session=ort.InferenceSession(paths[0],sess_options=options,providers=['CPUExecutionProvider'])
            self.engine = CompatibleKokoro.from_session(session,paths[1])
            self.paths = paths
        audio, rate = self.engine.create(text, voice=config['voice'], speed=config['speed'], lang='en-us')
        output = io.BytesIO()
        sf.write(output, audio, rate, format='WAV', subtype='PCM_16')
        return output.getvalue()
