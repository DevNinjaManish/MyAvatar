import test from 'node:test';
import assert from 'node:assert/strict';
import {formatLatencyBreakdown} from '../../src/conversation/latency-ui.js';

test('voice latency breakdown exposes the useful local stages',()=>{
  const text=formatLatencyBreakdown({
    speech_received_to_stt_ms:310,
    stt_to_first_token_ms:180,
    first_chunk_ready_ms:245,
    first_tts_ms:120,
    server_first_audio_ms:510
  });
  assert.match(text,/STT: 0\.31s/);
  assert.match(text,/First token: 0\.18s/);
  assert.match(text,/First speech chunk: 0\.24s/);
  assert.match(text,/First TTS synth: 0\.12s/);
  assert.match(text,/Server first audio: 0\.51s/);
});

test('latency breakdown ignores missing and non-finite stages',()=>{
  const text=formatLatencyBreakdown({first_chunk_ready_ms:200,first_tts_ms:Number.NaN});
  assert.equal(text,'First speech chunk: 0.20s');
});
