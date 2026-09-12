# MyAvatar

MyAvatar is a local-first macOS companion that lives in one compact widget. The repository is now in V1 development: Nova is the default voice-first companion, with a local runtime, context-aware behavior, 2.5D presence, and QA-driven iteration.

The MVP foundation is complete. V1 planning and implementation guidance live in the [V1 documentation index](docs/README.md).

## Run the widget

Requirements: macOS, Node.js 20+, and npm.

```sh
npm ci
npm start
```

For a production renderer build:

```sh
npm run build
```

The app is always widget-only. There is no full-screen mode, dashboard, coding workspace, calendar, terminal, or specialist window in the MVP foundation.

## Repository map

```text
docs/V1_*.md       active V1 product, architecture, design, and QA documentation
docs/v1-wireframes/ V1 structural wireframes
docs/archive/      completed MVP documents retained for historical reference
config.json        small local model and default-companion configuration
models/            ignored local model assets with a checked-in README
src/app/           renderer entry point and interaction wiring
src/avatar/        avatar rendering primitives
src/audio/         microphone, voice activity, and playback contracts
src/conversation/  chat state and event contracts
src/styles/        widget styles
electron/          one native widget window and minimal preload bridge
tests/js/           focused JavaScript contract tests
```

Start with [the V1 documentation index](docs/README.md), especially the [scope](docs/V1_SCOPE.md), [backlog](docs/V1_BACKLOG.md), and [acceptance checklist](docs/V1_ACCEPTANCE.md).

## Validation

```sh
npm test
npm run build
npm run doctor
npm run test:voice
```

Native smoke QA and the V1 acceptance checklist are required before calling a V1 slice complete.

## Local-first rules

Do not add telemetry, cloud accounts, paid runtime APIs, remote model providers, or persisted sensitive data without an explicit product decision. See [SECURITY](docs/SECURITY.md) and [CONTRIBUTING](docs/CONTRIBUTING.md).

MyAvatar is released under the [MIT License](LICENSE).

## Optional voice setup

Typed chat works without voice dependencies. To enable local voice input, install Whisper and FFmpeg on macOS:

```sh
brew install openai-whisper ffmpeg
npm run doctor
```

The first voice turn downloads the configured Whisper `tiny` model if it is not already cached. macOS speech output uses the built-in `say` command. If Whisper is unavailable, the widget keeps typed chat available and shows a recoverable voice warning.
