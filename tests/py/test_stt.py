import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np

from backend.providers.stt import _pcm_array, transcribe


class SpeechRecognitionGuards(unittest.TestCase):
    def test_malformed_or_too_short_pcm_becomes_no_speech(self):
        self.assertIsNone(_pcm_array(b'abc'))
        self.assertEqual(transcribe(b'abc', {'model':'unused','language':'en'}), '')
        self.assertIsNone(_pcm_array(b'\x00' * 6401))

    def test_nonfinite_pcm_is_sanitized_before_whisper(self):
        audio=np.full(2000, .02, dtype='<f4');audio[2]=np.nan;audio[4]=np.inf
        captured=[]
        fake=SimpleNamespace(transcribe=lambda samples, **kwargs:(captured.append(samples.copy()) or {'text':'  hello  '}))
        with patch.dict(sys.modules, {'mlx_whisper':fake}):
            result=transcribe(audio.tobytes(), {'model':'model','language':'en'})
        self.assertEqual(result, 'hello')
        self.assertTrue(np.isfinite(captured[0]).all())
        self.assertLessEqual(float(np.max(captured[0])), 1.0)

    def test_quiet_audio_skips_model_loading(self):
        audio=np.zeros(2000, dtype='<f4')
        with patch.dict(sys.modules, {'mlx_whisper':SimpleNamespace(transcribe=lambda *_args,**_kwargs:self.fail('Whisper should not run'))}):
            self.assertEqual(transcribe(audio.tobytes(), {'model':'model','language':'en'}), '')

    def test_missing_or_non_dict_whisper_text_degrades_to_empty_transcript(self):
        audio=np.full(2000, .02, dtype='<f4')
        for result in ({}, None, {'text':None}):
            with self.subTest(result=result), patch.dict(sys.modules, {'mlx_whisper':SimpleNamespace(transcribe=lambda *_args,**_kwargs:result)}):
                self.assertEqual(transcribe(audio.tobytes(), {'model':'model','language':'en'}), '')


if __name__ == '__main__':
    unittest.main()
