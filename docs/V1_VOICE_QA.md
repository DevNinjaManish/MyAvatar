# Voice implementation and evidence — 2026-09-12

Implemented in this batch:

- Recent dialogue (six exchanges) retained per bot for the runtime connection;
  Clear conversation removes it. Reconnection does not restore this history.
- Sentence generation and synthesis overlap. Audio is decoded in arrival order,
  queued, and played through the same engine used for microphone interruption.
- Actual output amplitude drives the avatar mouth, including the greeting.
- Speech onset can cancel playback; captured interruption becomes the next turn.
- Stopped turns cannot deliver late audio. Pending sentence jobs skip cancelled
  turns; a synthesis already executing may finish internally before being discarded.
- Listening resumes only after server completion and all audio settles.
- Endpoint silence is 480 ms for ordinary speech and 420 ms for interruption, with
  adaptive room-noise calibration and release hysteresis. This remains an energy-based detector, not semantic
  understanding of whether a sentence is finished.
- Balanced uses local huihui_ai/qwen3.5-abliterated:4b; Fast uses huihui_ai/qwen3.5-abliterated:0.8b. An explicit model
  environment setting overrides both. Models must already be installed.

Evidence:

- 87 JavaScript tests, including ordered decoding, stale decode cancellation,
  streamed sentence boundaries, and interruption onset with retained speech.
- Production build passes (existing bundle-size warning remains).
- Runtime smoke and recorded speech input integration passed.
- `node scripts/test-voice-dialogue.mjs` passed six spoken turns: Nova recalled
  mango from the previous turn, a two-sentence fixture produced two WAV chunks,
  and Sterling, Rivit, and Luma each returned valid audio.
- Native Electron inspection: two-sentence reply returned to Listening and Send;
  a longer streamed story showed Speaking with mouth movement; pressing Stop
  returned immediately to Listening. Chat controls fit within the display after
  reserving vertical expansion space at launch. This is visual/state evidence,
  not a subjective audio-quality rating or real-microphone interruption test.

Still unqualified: extended real-microphone noisy-room interruption, all target
hardware, and subjective naturalness. Per-sentence speed/emotion remains basic;
authored laughs/breaths/backchannels, pitch control, semantic endpointing, and
persistent memory are not implemented. These are not implied by passing tests.

## Recognition and response latency follow-up

- Active recognizer: persistent Faster-Whisper small, int8 CPU, automatic
  language detection for Hindi–English. No MLX or Apple system voices in the
  runtime. Kokoro supplies Hindi and English voice models locally.
- Simple greetings/thanks bypass generation. Delayed acknowledgements are contextual,
  persona-specific, rotating, and only scheduled for requests of seven or more words
  after recognition, at 3.5 seconds. They are cancelled on reply audio, stop,
  completion, or disconnect.
- Recognition now exposes an explicit `Understanding…` state. Faster-Whisper uses a
  beam-one low-latency pass, multilingual VAD filtering, and a Hindi–English prompt.
- TTS starts at a natural clause boundary on long first sentences instead of always
  waiting for final sentence punctuation.
- The direct spoken `How are you?` fixture was recognized exactly and returned
  reply audio at 2,050 ms with zero filler. This excludes microphone endpointing
  and uses a synthetic WAV; real-room latency can differ.
- Clear English recognition was exact at 1,414 ms in the isolated fixture. The
  Hindi fixture was normalized to the intended sentence at 2,070 ms. The
  deliberately difficult synthetic mixed-language fixture was rejected as
  uncertain at 2,135 ms rather than accepted confidently. Real microphone
  Hinglish still requires human QA; do not call recognition fully fixed from
  synthesized fixtures alone.
- Repeated/hallucinated recognition and low-confidence segments trigger a
  clarification rather than normal answer generation; this heuristic will not
  catch every incorrect word.
