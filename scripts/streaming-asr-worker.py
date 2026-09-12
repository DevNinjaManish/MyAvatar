"""Low-latency local English streaming ASR worker for MyAvatar."""
import base64
import json
import os
import sys
import time

import numpy as np
import sherpa_onnx

root = sys.argv[1]
recognizer = sherpa_onnx.OnlineRecognizer.from_transducer(
    tokens=os.path.join(root, 'tokens.txt'),
    encoder=os.path.join(root, 'encoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx'),
    decoder=os.path.join(root, 'decoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx'),
    joiner=os.path.join(root, 'joiner-epoch-99-avg-1-chunk-16-left-128.int8.onnx'),
    num_threads=2, provider='cpu', sample_rate=16000, feature_dim=80,
    decoding_method='greedy_search',
)
streams = {}

def decode(stream):
    while recognizer.is_ready(stream):
        recognizer.decode_stream(stream)
    result = recognizer.get_result(stream)
    return (result if isinstance(result, str) else result.text).strip()

def emit(value):
    print(json.dumps(value), flush=True)

emit({'ready': True})
for line in sys.stdin:
    try:
        request = json.loads(line)
        stream_id = request['streamId']
        operation = request['operation']
        if operation == 'start':
            streams[stream_id] = {'stream': recognizer.create_stream(), 'started': time.monotonic(), 'text': ''}
        elif operation == 'feed' and stream_id in streams:
            state = streams[stream_id]
            samples = np.frombuffer(base64.b64decode(request['audio']), dtype=np.float32)
            state['stream'].accept_waveform(16000, samples)
            text = decode(state['stream'])
            if text and text != state['text']:
                state['text'] = text
                emit({'streamId': stream_id, 'type': 'partial', 'text': text})
        elif operation == 'end' and stream_id in streams:
            state = streams.pop(stream_id)
            state['stream'].input_finished()
            text = decode(state['stream'])
            emit({'streamId': stream_id, 'type': 'final', 'text': text,
                  'durationMs': round((time.monotonic() - state['started']) * 1000)})
        elif operation == 'cancel':
            streams.pop(stream_id, None)
    except Exception as error:
        emit({'streamId': request.get('streamId', ''), 'type': 'error', 'error': str(error)})
