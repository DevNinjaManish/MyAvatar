# Observed local results — 2026-09-08

Machine: Apple M1 Pro, 16 GB unified memory, macOS 26.6.2. Default: Qwen3.5 4B Q4_K_M, Ollama 0.33.3, 4096 context, thinking disabled; MLX Whisper base.en; Kokoro ONNX CPU with four inference threads.

These are individual development observations, not percentile benchmarks. Generated speech was used as a controlled STT fixture. Actual room noise, microphone, answer length, model loading, competing apps, and thermals will change latency.

| Measurement | Observed |
|---|---:|
| First-ever Whisper call (imports/initial compile) | 62.12 s |
| Subsequent fresh-process STT on 3.26 s synthetic clip | 2.33–2.64 s |
| Repeated warm STT on that clip | 0.105–0.125 s |
| Kokoro cold setup + short synthesis | 3.52–4.93 s |
| Kokoro warm short greeting | 0.83 s |
| Kokoro warm first response sentence | 1.44 s |
| LLM cold first content token | 28.93 s |
| LLM warm first content token | 0.32 s |
| Typed UI test: text → first token | 1.14 s |
| Typed UI test: first token → first audio scheduling | 0.83 s |
| Typed UI test: text → first audio scheduling | 1.97 s |
| Typed UI test: through final audio completion | 8.89 s |
| Running service, synthetic speech → STT | 2.05 s |
| Running service, STT → first LLM token | 0.97 s |
| Running service, first token → first WAV received | 1.29 s |
| Running service, speech → first WAV received | 4.31 s |
| Running service, all generation complete (4 audio chunks) | 9.04 s |

The synthetic service test does not include actual microphone capture or speaker hardware latency. The typed UI test includes Web Audio scheduling and playback completion. Native Electron microphone activation reached LISTENING, but a spoken live-user conversation has not been assessed for recognition quality.

Ollama reported 3.1 GB model runtime, 100% GPU, 4096-token context. Renderer was observed around 53–60 FPS after the cap (some browser captures showed 46–56 FPS with multiple test views and inference running). Initially uncapped, the desktop renderer reached the display's 120 FPS; V1 caps it at 60 to reduce load.

The application now warms STT, TTS, and the LLM at launch. LLM cold loading can recur if the model has been evicted after idle time. The original configuration retained the model for five minutes; current tuning below extends this to thirty minutes.

## Reproduce

```sh
cd /Users/Manish/GitHub/MyAvatar
HF_HUB_OFFLINE=1 .venv/bin/python scripts/benchmark.py
# With npm start running and the benchmark fixture created:
.venv/bin/python scripts/smoke.py
```

Raw development results are under ignored `logs/benchmark.json`, `logs/smoke.json`, and `logs/latency.jsonl`. The sample LLM produced an incorrect ocean fact in its cold run; a successful response is not a factual-accuracy guarantee. Mira's prompt asks for concise conversation, and this V1 has no retrieval/fact-checking subsystem.


## Conversation tuning — September 8, evening

Recent live logs before tuning recorded 5.17–5.89 seconds from speech end to playback start, with 3.21–3.93 seconds from first token to audio. A separate warm synthetic baseline was already faster at 1.96 seconds to first WAV; these are different conversations, so the figures are not a controlled percentage improvement.

Changes: first speech chunk capped near 56 characters (or an earlier clause), later chunks at 140 characters; prompts request a short opening and concise replies; Kokoro speed 1.06; silence detection 600 ms instead of 950 ms; post-playback microphone gate 250 ms instead of 550 ms; Ollama keep-alive 30 minutes instead of five. All values are configurable in config.json. Shorter silence detection can submit a turn during a long mid-sentence pause; raise audio.vad.silenceMs if that happens.

Two completed synthetic-audio tests of the updated running service:

| Measurement | Run 1 | Run 2 |
|---|---:|---:|
| Audio received → STT | 153 ms | 152 ms |
| STT → first token | 838 ms | 147 ms |
| First token → first WAV received | 1,799 ms | 1,364 ms |
| Audio received → first WAV received | 2,790 ms | 1,662 ms |
| First TTS chunk synthesis | 1,078 ms | 996 ms |
| All server generation complete | 4,258 ms | 3,815 ms |

Add approximately 600 ms turn detection plus decoding/output-device latency for live microphone use. These observations suggest roughly 2.3–3.4 seconds to speech under similar warm conditions, not a guarantee. The attempted third test was interrupted by service shutdown and is excluded. Raw results: logs/latency-check/after-1.json and after-2.json. Tests use the existing synthetic voice fixture and do not open the microphone.

New server fields first_chunk_ready_ms, first_tts_ms, and server_first_audio_ms distinguish text buffering from speech synthesis. The renderer continues to measure actual audio scheduling and full playback duration.
