# MyAvatar

MyAvatar is a free, local-first Mac desktop companion with four original robot personalities: Rivet, Nova, Sterling, and Pixel. It captures microphone input locally, transcribes with MLX Whisper, responds through Ollama, synthesizes speech with Kokoro, and animates an art-directed robot portrait in an Electron widget.

No paid API is required at runtime. The app runs its service only on `127.0.0.1`; microphone audio, transcripts, and conversation history stay on the Mac.

## What it includes

- Circular, draggable macOS widget with minimize, maximize, close, microphone, stop, and bot-library controls.
- Four visually distinct original robot portraits with camera shutters, embedded speaker-grille equalizers, status lights, and subtle 2.5D motion.
- Hands-free local conversation using voice activity detection, plus a manual capture fallback.
- Local MLX Whisper STT, Ollama LLM streaming, and Kokoro ONNX TTS.
- Local conversation history per bot for the active app session.
- State-driven idle, listening, thinking, and speaking behavior.
- Latency metrics for speech-to-text, first token, first audio, and end-to-end playback.

## Requirements

- macOS on Apple Silicon; the project was developed on an M1 Pro with 16 GB unified memory.
- Node.js 22.12 or newer.
- Python 3.11 and [uv](https://docs.astral.sh/uv/).
- [Ollama](https://ollama.com/).

## Setup

```sh
brew install node uv
brew install --cask ollama
open -a Ollama

cd /Users/Manish/GitHub/MyAvatar
npm ci
uv venv --python 3.11
uv pip install -r requirements.lock
```

Download the local models. The default Ollama model is roughly 3.4 GB; the speech weights add roughly 500 MB.

```sh
ollama pull qwen3.5:4b
.venv/bin/python scripts/download_models.py
```

## Run

```sh
cd /Users/Manish/GitHub/MyAvatar
npm start
```

The app warms the local models, then enables the microphone. Click the microphone once to begin hands-free conversation; pause for about 600 ms to submit a turn. Click it again, or click Stop, to end the session.

## Bots

| Bot | Role | Default local voice |
| --- | --- | --- |
| Rivet | Witty repair robot | `am_michael` |
| Nova | Charming, playful assistant | `af_heart` |
| Sterling | Wise British-style butler | `bm_george` |
| Pixel | Bold marketing intern | `af_sarah` |

Use the widget bot-library icon or the full-window selector to switch. Each bot has its own in-session history, voice, system prompt, portrait, and hardware color language. The included portraits are art-directed 2.5D assets under `public/assets/bots/`; speaker activity and camera shutters are composited inside the real illustrated hardware instead of as UI overlays.

## Configuration

[`config.json`](config.json) holds all local providers, model names, bot prompts, voices, VAD settings, and conversation tuning. The default model is swappable. Restart the app after editing persistent configuration.

The project never stores an API key. A random per-launch token protects the loopback WebSocket between Electron and the local Python service; it is generated in memory and is not written to disk or committed.

## Tests and diagnostics

```sh
npm test
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
npm run build
HF_HUB_OFFLINE=1 .venv/bin/python scripts/benchmark.py
```

See [LATENCY.md](LATENCY.md) for observed Apple Silicon timings and [ARCHITECTURE.md](ARCHITECTURE.md) for module boundaries, cancellation, and privacy details.

## Project layout

```text
electron/                 native window and narrow IPC bridge
src/avatar/               portrait renderer and state animation
src/audio/                microphone capture, VAD, playback, lip-sync amplitude
src/conversation/         front-end interaction state
backend/stt/              MLX Whisper provider
backend/tts/              Kokoro ONNX provider
backend/llm/              Ollama streaming provider
backend/conversation/     response chunking
public/assets/bots/       included robot portrait assets
tests/                    Node and Python regression tests
```

## Limitations

This is a source-run V1, not a signed standalone `.app`. It is sequential hands-free conversation: speech detection pauses while the bot is thinking or speaking, so true full-duplex barge-in is not implemented. Kokoro output is chunked and can leave short pauses between clauses. The current model setup is English-first.

## Open source

MyAvatar is released under the [MIT License](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance and [SECURITY.md](SECURITY.md) for reporting vulnerabilities. Downloaded model weights remain subject to their respective upstream licenses and are deliberately not committed to this repository.
