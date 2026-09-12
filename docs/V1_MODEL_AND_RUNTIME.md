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

### Fast

Fast is optimized for slower or resource-constrained Macs. It uses smaller models, shorter context windows, lighter memory retrieval, and reduced visual effects to keep voice interaction responsive.

The Fast conversational model should remain warm in memory where possible so a user can begin speaking without waiting for model startup. When quality and responsiveness conflict, Fast chooses responsiveness.

### Balanced

Balanced uses additional reasoning depth and richer context when hardware allows, but it must not feel sluggish. The system should stream an early response or provide a truthful conversational acknowledgement while deeper work continues.

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
