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
- Endpoint silence adapts to the utterance: a brief turn releases after 360 ms
  of silence, while longer speech retains a 480 ms pause window. Interruption
  uses 420 ms. Room-noise calibration and release hysteresis remain active.
  This is still an energy-based detector, not semantic understanding of whether
  a sentence is finished.
- Room-noise learning is continuous and non-blocking, so speech is accepted
  immediately after listening starts. Browser echo cancellation, noise
  suppression, and automatic gain are explicitly requested before the local
  detector sees audio.
- A noise burst that reaches onset but fails minimum speech duration now cancels
  its provisional streaming session. It cannot contaminate the next real turn.
- English microphone frames are sent to the local streaming Zipformer recognizer
  in 160 ms batches for provisional captions and exact immediate commands only.
  Persistent Faster-Whisper `large-v3-turbo` is authoritative for every normal
  conversational utterance, including English, Hindi, and Hinglish.
- Streaming begins with the detector's retained pre-roll and includes trailing
  endpoint frames. A finalized exact stop/cancel command may be handled directly;
  a stale partial is never acted on. Normal turns always go through Whisper.
  The 360 ms endpoint now applies only below 520 ms of voiced speech; full
  sentences retain the safer 480 ms pause window.
- Live barge-in uses its own detector and never performs startup calibration.
  It may interrupt after 260 ms of reply playback when it hears 110 ms of user
  speech; the shorter guard is supported by the browser echo-cancellation path.
- Fast uses local `huihui_ai/qwen3.5-abliterated:4b` for every reply; Balanced
  uses `huihui_ai/qwen3.5-abliterated:9b` for every reply. The selected model is
  warmed before the profile becomes active. The 0.8B model is not exposed.

Evidence:

- 103 JavaScript tests, including ordered decoding, stale decode cancellation,
  streamed sentence boundaries, and interruption onset with retained speech.
- Production build passes (existing bundle-size warning remains).
- Runtime smoke and recorded speech input integration passed.
- `npm run test:streaming-voice` passed with streamed `HOW ARE YOU` recognized
  through the Zipformer path and selected by the conversation service.
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

- Active authoritative recognizer: persistent Faster-Whisper `large-v3-turbo`, int8 CPU, beam-two
  decoding by default, automatic
  language detection for Hindi–English. No MLX or Apple system voices in the
  runtime. Kokoro supplies Hindi and English voice models locally.
- Simple greetings/thanks bypass generation. Delayed acknowledgements are contextual,
  persona-specific, rotating, and only scheduled for requests of seven or more words
  after recognition, at 3.5 seconds. They are cancelled on reply audio, stop,
  completion, or disconnect.
- Recognition now exposes an explicit `Understanding…` state. Faster-Whisper uses a
  beam-two quality-first pass, less aggressive trailing-speech preservation,
  multilingual VAD filtering, and a Hindi–English prompt. A weak automatically
  detected English result receives one English-only higher-beam recovery pass.
- TTS starts at a natural clause boundary on long first sentences instead of always
  waiting for final sentence punctuation. Spoken generation is instructed to
  lead with a short complete sentence, and uses a lower clause threshold so the
  first WAV can begin sooner.
- Fast uses 4B for all spoken and typed replies; Balanced uses 9B for all spoken
  and typed replies. Both routes stream output and remain interruptible.
- 2026-09-12 benchmark on the target 16GB Apple Silicon Mac: warm Ollama first
  token was 172 ms for 4B and 303 ms for 9B. Cold model-load first token was
  4,750 ms and 7,112 ms respectively. Total generation depends on requested
  length; the bounded benchmark completed in 772 ms for 4B and 5,663 ms for 9B.
- On the same Mac, persistent `large-v3-turbo` decoded the clear synthetic
  English fixture exactly in 6,579 ms and the Hindi fixture accurately in
  8,710 ms. The end-to-end voice integration reported 6,905 ms recognition and
  8,529 ms to first reply audio. Zipformer produced the provisional `HOW ARE
  YOU` caption, while authoritative Whisper returned `How are you?` in 7,887 ms.
- The deliberately difficult synthesized Hinglish fixture took 8,459 ms and
  produced awkward code-switching that the uncertainty heuristic did not flag.
  Real-microphone Hinglish and noisy-room latency remain human-QA requirements;
  the synthetic benchmark is not evidence that those cases are fully qualified.
- On this 16 GB Mac, switching from 9B back to Fast took 3,853 ms to restore
  4B, after which a reply reached first token in 986 ms. That explicit switch is
  preferable to hidden per-request model eviction and reloads.
- Repeated/hallucinated recognition and low-confidence segments trigger a
  clarification rather than normal answer generation; this heuristic will not
  catch every incorrect word.
- Reply language follows the newest recognized turn, not prior conversation
  history. An explicit “switch back to English” applies English-only output to
  that response, even after a Hindi turn.
