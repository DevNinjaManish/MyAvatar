import sys
import types
import unittest
from unittest.mock import patch

import numpy as np

from backend.providers.stt import transcribe


class STTRetryTests(unittest.TestCase):
    def _pcm(self):
        return np.full(3200, 0.05, dtype='<f4').tobytes()

    def test_transient_failure_retries_once(self):
        calls=[]
        module=types.SimpleNamespace()
        def fake(audio, **kwargs):
            calls.append(kwargs)
            if len(calls)==1:
                raise RuntimeError('temporary mlx failure')
            return {'text':' hello '}
        module.transcribe=fake
        with patch.dict(sys.modules, {'mlx_whisper':module}):
            result=transcribe(self._pcm(), {'model':'local','language':'en'})
        self.assertEqual(result,'hello')
        self.assertEqual(len(calls),2)

    def test_persistent_transient_failure_stops_after_one_retry(self):
        module=types.SimpleNamespace(transcribe=lambda *args,**kwargs: (_ for _ in ()).throw(OSError('device busy')))
        with patch.dict(sys.modules, {'mlx_whisper':module}):
            with self.assertRaises(OSError):
                transcribe(self._pcm(), {'model':'local','language':'en'})

    def test_non_transient_programming_error_is_not_retried(self):
        calls=[]
        def fake(*args,**kwargs):
            calls.append(1)
            raise ValueError('bad configuration')
        module=types.SimpleNamespace(transcribe=fake)
        with patch.dict(sys.modules, {'mlx_whisper':module}):
            with self.assertRaises(ValueError):
                transcribe(self._pcm(), {'model':'local','language':'en'})
        self.assertEqual(len(calls),1)


if __name__=='__main__':
    unittest.main()
