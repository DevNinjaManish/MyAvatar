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
- Opt-in screen awareness with brief companion comments; raw frames are discarded and only derived comments enter the local activity log.
- Click reactions and an icon-based companion picker in the compact widget.

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

Check that the Mac, local services, models, and speech assets are ready with `npm run doctor`. The report stays on the Mac and identifies missing prerequisites.

Download Fast and Balanced for the normal experience. High is optional. Fast uses about 1 GB, Balanced about 3.3 GB, and High about 6.6 GB. Speech assets add roughly 500 MB.

```sh
ollama pull huihui_ai/qwen3.5-abliterated:0.8b
ollama pull huihui_ai/qwen3.5-abliterated:4b
# Optional power mode
ollama pull huihui_ai/qwen3.5-abliterated:9b
.venv/bin/python scripts/download_models.py
```

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
| Fast | `huihui_ai/qwen3.5-abliterated:0.8b`, 2K context, 45 FPS | Lowest latency and memory use |
| Balanced · Recommended | `huihui_ai/qwen3.5-abliterated:4b`, 4K context, 60 FPS | Natural everyday voice conversations |
| High · Power | `huihui_ai/qwen3.5-abliterated:9b`, 6K context, 60 FPS | Harder planning, coding, and writing on Macs with enough memory |

Widget size remains fixed in both modes. Switching mode gives a greeting, then resumes hands-free listening.

## Use and privacy

On first launch, onboarding explains the local-only design, lets you choose a companion and performance mode, then asks for microphone access only when you begin a conversation. Speak, then pause briefly to submit a turn. In the widget, the microphone button starts listening and then becomes the mute/unmute toggle; End voice conversation remains available in More. Stop ends playback. The state display shows Listening, Thinking, and Speaking. Local setup, microphone, connection, and runtime errors also appear in widget chat with an unread badge, so compact mode does not hide failures.

The widget eye enables screen awareness. It takes an immediate snapshot and, while left on, observes again only after an idle interval. Screen images are sent only to the configured Ollama service on `127.0.0.1`, discarded after the turn, and never added to conversation memory. Derived comments are stored in ignored `data/screen-awareness/events.jsonl`.

[`config.json`](config.json) contains provider defaults, bot prompts, voices, profiles, and VAD tuning. Voice activation adapts to steady ambient noise and rejects short clicks and bumps; unusually quiet microphones or loud rooms can be tuned with `audio.vad.threshold`, `noiseMultiplier`, and `minSpeechMs`. Runtime choices save to ignored `data/settings.json`; no API key is stored. Conversation memory is off by default and can be enabled in Settings; it stays in ignored local files.

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
