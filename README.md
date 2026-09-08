# MyAvatar

MyAvatar is a free, local-first macOS robot companion. Five original bots use MLX Whisper for speech-to-text, Ollama for conversation, Kokoro for speech, and an animated Electron widget for presence.

No paid API is required. The app binds only to `127.0.0.1`; microphone audio, conversation, and inference stay on the Mac.

## What it does

- Draggable compact widget plus a clean expanded controls workspace.
- Local microphone conversation with automatic turn detection and a manual fallback.
- Live speaker-hardware lip sync, camera shutters, breathing, listening pulses, thinking scans, and speaking motion.
- State-aware portrait hardware: speaker equalizers illuminate only while a companion is speaking.
- Short greetings and automatic hands-free listening after launch, bot changes, and performance changes.
- Persistent selected bot, microphone mode, and performance mode in ignored local settings.

## Bots

| Bot | Focus |
| --- | --- |
| Rivet | Coding, debugging, architecture, and technical troubleshooting |
| Nova | Charming proactive personal assistant for planning and everyday work |
| Sterling | Calm executive assistant for priorities, plans, and communication |
| Pixel | Marketing strategy, campaigns, content, positioning, and growth ideas |
| Luma | Product design, UX critique, visual systems, and creative direction |

## Quick start

Install prerequisites once:

```sh
brew install node uv
brew install --cask ollama
open -a Ollama
```

Clone and install:

```sh
git clone https://github.com/DevNinjaManish/MyAvatar.git
cd MyAvatar
npm run setup
```

Check that the Mac, local services, models, and speech assets are ready with `npm run doctor`. The report stays on the Mac and identifies missing prerequisites, including when Low mode is the sensible choice for lower-memory hardware.

Download the Low and Medium models. Low mode uses a 1 GB LLM; speech assets add roughly 500 MB. High mode is optional and needs the larger 9B model.

```sh
ollama pull qwen3.5:0.8b
ollama pull qwen3.5:4b
.venv/bin/python scripts/download_models.py
```

To enable **High** mode, also run the qwen3.5:9b Ollama pull command.

Create a double-click launcher:

```sh
npm run app
```

Double-click `MyAvatar.app` in the cloned folder. Keep it with the project. If launch fails, see `~/Library/Logs/MyAvatar-launcher.log`.

For development, use `npm start`.

## Performance modes

Open **Settings** from the widget or expanded view.

| Mode | LLM | Best for |
| --- | --- | --- |
| Low | `qwen3.5:0.8b`, 2K context, 45 FPS | Apple Silicon MacBook Air and low-power use |
| Medium | `qwen3.5:4b`, 4K context, 60 FPS | 16 GB Apple Silicon Macs |
| High | `qwen3.5:9b`, 6K context, 60 FPS | Apple Silicon Macs with ample memory |

Widget size remains fixed in both modes. Switching mode gives a greeting, then resumes hands-free listening.

## Use and privacy

On first launch, onboarding explains the local-only design, lets you choose a companion and performance mode, then asks for microphone access only when you begin a conversation. Speak, then pause briefly to submit a turn. Stop ends playback and microphone capture. The state display shows Listening, Thinking, and Speaking.

[`config.json`](config.json) contains provider defaults, bot prompts, voices, profiles, and VAD tuning. Runtime choices save to ignored `data/settings.json`; no API key is stored.

## Validation

```sh
npm test
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
npm run build
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for module details and [LATENCY.md](LATENCY.md) for observed timings.

## Limitations

This is a source-run V1 with a generated launcher, not a signed distributable app. On first launch, macOS asks for microphone permission. Conversation is sequential; full-duplex barge-in is not implemented. The speech path is English-first.

MyAvatar is released under the [MIT License](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [ROADMAP.md](ROADMAP.md).
