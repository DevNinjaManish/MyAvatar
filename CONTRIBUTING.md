# Contributing

Thanks for improving MyAvatar. Keep the project local-first: do not add paid-runtime APIs, telemetry, remote analytics, or cloud dependencies without an explicit discussion.

## Development

1. Follow the setup instructions in [README.md](README.md).
2. Keep microphone, STT, TTS, LLM, and avatar work separated by the existing module boundaries.
3. Put model and provider choices in `config.json`, not hard-coded into feature code.
4. Do not commit model weights, logs, virtual environments, build output, or credentials.
5. Add focused tests for behavior changes, then run `npm test`, the Python test suite, and `npm run build`.

## Pull requests

Describe the user-visible change, configuration changes, and validation. Preserve the four original bot identities and keep new visual assets free of third-party character likenesses or logos.
