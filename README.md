# MyAvatar

MyAvatar is a local-first macOS companion that lives in one compact widget. Nova is the default voice-first companion, with a local runtime, context-aware behavior, 2.5D presence, and QA-driven iteration.

V1 planning and implementation guidance live in the [V1 documentation index](docs/README.md).

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

The app remains widget-first: it has no full-screen dashboard. Chat and a companion workspace can open beside the avatar without changing its scale. Nova’s Today surface is a local focus, reminder, schedule, and plan workspace; it is not a connected calendar.

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
npm run test:streaming-voice
npm run test:runtime
```

Native smoke QA and the V1 acceptance checklist are required before calling a V1 slice complete.

## Local-first rules

Do not add telemetry, cloud accounts, paid runtime APIs, remote model providers, or persisted sensitive data without an explicit product decision. See [SECURITY](docs/SECURITY.md) and [CONTRIBUTING](docs/CONTRIBUTING.md).

MyAvatar is released under the [MIT License](LICENSE).

## Local voice setup

Create the project virtual environment, install the checked-in voice dependencies,
and install Ollama. On Apple Silicon, Fast restores the original low-latency
MLX `whisper-base.en` path with Qwen 4B, while Balanced uses multilingual MLX
`large-v3-turbo` with Qwen 9B. Zipformer supplies provisional captions and
Kokoro supplies persona voices. Intel retains Faster-Whisper as a fallback:

```sh
python3 -m venv .venv
uv pip install --python .venv/bin/python -r requirements-voice.txt
ollama pull huihui_ai/qwen3.5-abliterated:4b
ollama pull huihui_ai/qwen3.5-abliterated:9b
npm run doctor
```

Large model files live outside Git. Do not delete existing Ollama or Hugging Face
models during setup. Kokoro and Zipformer assets are expected under `models/`.
The selected profile's recognizer performs a real warm inference before the
companion may show Ready. During boot, the widget shows truthful local-only
progress for recognition, provisional captions, TTS, conversation warmup, and
the final voice check; controls remain disabled and the avatar stays hidden.
Changing Fast/Balanced warms the next profile before activating it; it does not
make the first utterance pay setup cost. Spoken replies begin from an early
natural clause while later text continues to stream into Chat.
If an authoritative recognizer or TTS asset is unavailable, the widget keeps
typed chat available and shows a recoverable voice warning.

## Local Luma images

On an Apple Silicon Mac, Luma can generate one 512×512 image at a time or
transform one uploaded PNG, JPEG, or WebP image. The first Luma request installs
the SD 1.5 weights under MyAvatar application support; the repository remains
free of image-model assets. The worker uses Metal with attention slicing for
16 GB Macs, and both source images and generated PNGs stay on-device. V1 edit
mode transforms the full image; mask-based object replacement is not yet part
of the product.
