# Voice implementation and evidence — 2026-09-12

Implemented in this batch:

- Recent dialogue (six exchanges) retained per bot for the runtime connection;
  Clear conversation removes it. Reconnection does not restore this history.
- Sentence generation and synthesis overlap. Audio is decoded in arrival order,
  queued, and played through the same engine used for microphone interruption.
- Actual output amplitude drives the avatar mouth, including the greeting.
- The Stop control cancels playback. Automatic acoustic barge-in is disabled by
  default so room noise or another nearby voice cannot cut off a reply.
- Stopped turns cannot deliver late audio. Pending sentence jobs skip cancelled
  turns; a synthesis already executing may finish internally before being discarded.
- Listening resumes only after server completion and all audio settles.
- Endpoint silence adapts to the utterance: a brief turn releases after 300 ms
  of silence, while longer speech retains a 440 ms pause window. Barge-in
  requires 360 ms of sustained voiced audio after a 400 ms guard. Room-noise
  calibration and release hysteresis remain active.
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
  A persistent MLX Whisper worker is authoritative for every normal turn:
  `base.en` in Fast and multilingual `large-v3-turbo` in Balanced.
- Streaming begins with the detector's retained pre-roll and includes trailing
  endpoint frames. A finalized exact stop/cancel command may be handled directly;
  a stale partial is never acted on. Normal turns always go through Whisper.
  The 360 ms endpoint now applies only below 520 ms of voiced speech; full
  sentences retain the safer 480 ms pause window.
- The V1 widget enables guarded acoustic interruption while speech is playing.
  It retains the same microphone capture, waits 450 ms after speaker onset,
  requires 320 ms of sustained voiced input, then cancels output and retains
  the user's speech for authoritative recognition. This is not unrestricted
  full-duplex conversation: room noise and short bursts must not interrupt.
- Fast uses local `huihui_ai/qwen3.5-abliterated:4b` for every reply; Balanced
  uses `huihui_ai/qwen3.5-abliterated:9b` for every reply. The selected model is
  warmed before the profile becomes active. The 0.8B model is not exposed.

Evidence:

- 105 JavaScript tests, including ordered decoding, stale decode cancellation,
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

- Active Apple Silicon recognizers: persistent MLX `whisper-base.en` in Fast and
  persistent MLX `large-v3-turbo` in Balanced. Fast is English-first; Balanced
  automatically detects Hindi–English. Intel retains Faster-Whisper as a
  compatibility fallback. Kokoro supplies Hindi and English voices locally.
- Simple greetings/thanks bypass generation. Delayed acknowledgements are contextual,
  persona-specific, rotating, and only scheduled for requests of seven or more words
  after recognition, at 3.5 seconds. They are cancelled on reply audio, stop,
  completion, or disconnect.
- Recognition exposes an explicit `Understanding…` state. The selected MLX
  worker is retained between turns and performs a real inference before it
  reports ready, so first-use model compilation cannot occur after the companion
  presents itself as alive.
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

### 2026-09-12 recognizer correction from repository history

- Commit `519f8c1` shows that the responsive pre-MVP voice path used Apple MLX
  `whisper-base.en`, not Faster-Whisper. Its checked-in latency record measured
  105–153 ms warm STT and about 2.3–3.4 seconds from live endpoint to first
  reply audio under comparable warm conditions.
- The same cached `base.en` model was re-run on this Mac: the first fixture took
  857 ms, then four retained-model English passes took 160–167 ms and produced
  the exact reference transcript.
- MLX `large-v3-turbo` retained the exact English and Hindi fixture output at
  2,301–2,609 ms. That is materially faster than the current Faster-Whisper CPU
  results (6,579–8,710 ms), while preserving the multilingual model for Balanced.
- MLX `small` reached 641 ms English and about 990 ms Hindi after warm-up, but
  repeated a token across the Hinglish fixture; it is rejected as the default.
- The 4-bit MLX large-turbo conversion used about 464 MB but was slower here
  (2,902–3,019 ms warm) and degraded the Hinglish output; it is rejected.
- WhisperKit's 632 MB Core ML turbo candidate downloaded successfully, but its
  Neural Engine specialization ran for more than six minutes and created heavy
  swap pressure on this 16 GB Mac. It is retained on disk but rejected as the
  simple, predictable default.
- Complete warm service tests measured Fast at 381–558 ms recognition and
  1,710–1,939 ms from audio receipt to first reply WAV. Balanced measured
  2,622–4,059 ms recognition and 3,781–6,308 ms to first reply WAV on the same
  English fixture. A short direct-reply streaming turn completed in 2,417 ms.
  Real-microphone percentile qualification remains necessary rather than
  claiming one fixed latency number.
- Starting in Fast and switching to Balanced passed the runtime integration:
  the next Whisper and Qwen models warmed before the profile event, and the
  previous recognizer was closed after the swap.

### 2026-09-12 repeated warm end-to-end profile check

The recorded Kokoro speech fixture was replayed through the running local
service after each profile had completed its own warm-up. These numbers include
authoritative recognition, response generation, and the first Kokoro reply WAV;
they are not microphone endpoint timings.

| Profile | Authoritative ASR | First reply WAV | Zipformer provisional turn |
| --- | ---: | ---: | ---: |
| Fast (`base.en` + Qwen 4B) | 352 ms | 1,938 ms | 211 ms total; final Whisper 190 ms |
| Balanced (`large-v3-turbo` + Qwen 9B) | 4,555 ms | 6,900 ms | 2,680 ms total; final Whisper 2,654 ms |

Conclusion: Fast is the sensible default for live voice conversation on this
16 GB Mac. Balanced remains the explicit quality option for multilingual or
complex work, where its stronger multilingual recognition and 9B reasoning are
worth the wait. Do not hide this difference with a visual “thinking” state or
by silently swapping models during a turn.
