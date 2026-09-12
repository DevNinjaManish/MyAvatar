# MyAvatar V1 model and runtime strategy

## Platform support

V1 supports both Apple Silicon and Intel Macs. Hardware detection selects an appropriate model bundle, runtime configuration, animation quality, and performance profile.

Apple Silicon may support larger or faster local models, but Intel remains a supported product path with smaller models and reduced visual effects where necessary.

## Small local model strategy

V1 remains local-first, but the complete voice, conversation, context, and
specialist model bundle may use up to approximately 20 GB of disk space. The
installer must explain that cost before downloading and allow a smaller core
install when the user prefers a faster setup.

V1 supports 8 GB Macs for the core voice and chat experience, 16 GB Macs for
the preferred Balanced profile, and up to 20 GB of local model storage for the
complete voice, context, and specialist bundle. Hardware detection may select
smaller models, shorter context, and lighter visual effects on constrained
machines.

The system may download additional capability models when needed. First run
should establish a useful voice conversation with the smallest appropriate
bundle, while clearly offering the complete approximately 20 GB installation.

Model roles are separated:

- Fast conversational model
- Balanced conversational/reasoning model
- Optional local vision model for Seeing Eye analysis
- Small embedding model for memory retrieval
- Speech recognition model
- Speech synthesis model

Bots share models where possible. Persona, voice, memory, emotional behavior, tools, and context policy create bot identity.

## Performance profiles

Auto mode selects Fast below 16 GB of system RAM and Balanced at 16 GB or
above. The More menu also allows an explicit Fast or Balanced override; the
selection is retained locally for the next launch. Profile changes affect the
conversation response budget and avatar rendering load without changing bot
identity or voice mapping.

Fast uses `huihui_ai/qwen3.5-abliterated:4b` for every reply. Balanced uses
`huihui_ai/qwen3.5-abliterated:9b` for every reply. `MYAVATAR_FAST_MODEL` and
`MYAVATAR_BALANCED_MODEL` override those two profiles. Both models must be
present in Ollama. The 0.8B model is not used in user-facing replies.

The configured stack is approximately 12 GB of model weights on disk
(4B + 9B Qwen, 1.5 GB Whisper, 342 MB Zipformer, and 337 MB Kokoro/voices),
inside the approximately 20 GB active-model budget. Only the selected profile's
Qwen model is loaded and warmed at a time. Switching profiles warms the next
model before the profile becomes active, avoiding hidden model swaps during a
conversation.

Voice inference uses local open-source Faster-Whisper `large-v3-turbo` (int8 CPU) for
multilingual recognition and Kokoro for English/Hindi speech. It does not use
Apple system voices or MLX. Recognition detects language automatically by
default for Hindi–English use; `MYAVATAR_SPEECH_LANGUAGE` can explicitly select
a language. The default decoder uses beam size two; `MYAVATAR_WHISPER_BEAM_SIZE`
can override it when a user deliberately prefers more speed or more accuracy.
Install Python dependencies from `requirements-voice.txt`.

Local streaming Zipformer, installed in `models/streaming-asr/`, receives
microphone frames during speech and supplies provisional captions. Its output is
never authoritative conversational input. Every ordinary utterance is decoded
again by Faster-Whisper after endpointing. Only an exact, narrow, harmless
immediate-command allowlist (`stop`, `cancel`, `stop talking`, `be quiet`, or
`never mind`) may act directly on a finalized Zipformer result.

### Fast

Fast is optimized for slower or resource-constrained Macs. It uses 4B for every
conversation, shorter context windows, lighter memory retrieval, and reduced
visual effects to keep voice interaction responsive. Auto selects Fast on a
MacBook Air, and users may always choose it manually on a MacBook Pro.

The Fast conversational model should remain warm in memory where possible so a user can begin speaking without waiting for model startup. When quality and responsiveness conflict, Fast chooses responsiveness.

### Balanced

Balanced uses 9B for every reply, richer context, and more visual detail. Auto
selects it on MacBook Pro hardware with 16 GB or more memory.

Natural filler is allowed when it reflects a real state:

- “Let me think about that.”
- “I’m checking the project now.”
- “Give me a moment to work through this.”

Filler must not be used to disguise a stalled runtime or fabricate progress. The bot should remain interruptible while thinking.

## Swappable model runtime

The application must not couple bot behavior directly to Ollama or any single model provider. A model adapter interface should support:

- Local chat generation
- Streaming tokens
- Cancellation
- Tool and structured output requests
- Embeddings
- Vision requests
- Model health and capability reporting

Ollama can remain the initial V1 adapter, but model selection and provider replacement must not require rewriting the bot framework, memory system, or UI.

## Rivit V1 scope

Rivit is a simple coding agent in V1. He can understand the selected project, inspect files and Git state, explain problems, suggest changes, prepare patches or commands, and run narrowly approved safe checks.

Destructive commands, broad autonomous edits, publishing, and unrestricted terminal control are outside the initial Rivit scope.

## Runtime resilience

Voice, animation, and basic companion interaction remain available if a deeper reasoning model, vision model, or background task is unavailable. Model failure should degrade to a smaller supported model or an honest limited state.

At launch, the companion remains in a sleeping “Warming…” state. It does not
present Ready, greet, accept chat or microphone input, or begin live listening
until Faster-Whisper, Zipformer, Kokoro, and both configured Ollama routes have
initialized successfully. A failed warmup leaves the companion unavailable with
the failure reason instead of presenting a partially ready bot.
