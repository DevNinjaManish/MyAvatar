# MyAvatar

MyAvatar is a local-first macOS companion that lives in one compact widget. The repository is being rebuilt around a small MVP: choose a companion, open chat, send a message, and receive a clear response.

The current commit is the clean foundation for that rebuild. It contains the widget shell, companion picker, approved visual reference, MVP planning documents, and the small renderer modules needed to begin implementation. Conversation service integration, microphone support, and native qualification are intentionally next work.

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
docs/mvp/          product scope, acceptance, wireframes, and design reference
config.json        small local model and default-companion configuration
models/            ignored local model assets with a checked-in README
src/app/           renderer entry point and MVP interaction wiring
src/avatar/        avatar rendering primitives
src/audio/         microphone, voice activity, and playback contracts
src/conversation/  chat state and event contracts
src/styles/        the single MVP stylesheet
electron/          one native widget window and minimal preload bridge
tests/js/           focused JavaScript contract tests
```

Start with [the MVP planning index](docs/mvp/README.md), then use [the scope](docs/mvp/SCOPE.md), [acceptance checklist](docs/mvp/ACCEPTANCE.md), and [design reference](docs/mvp/design/DESIGN_REFERENCE.md) as implementation constraints.

## Validation

```sh
npm test
npm run build
```

Native smoke QA is required before calling the MVP stable: launch, drag, companion switching, chat open/close, typed send, stop, quit, and relaunch.

## Local-first rules

Do not add telemetry, cloud accounts, paid runtime APIs, remote model providers, or persisted sensitive data without an explicit product decision. See [SECURITY](docs/SECURITY.md) and [CONTRIBUTING](docs/CONTRIBUTING.md).

MyAvatar is released under the [MIT License](LICENSE).
