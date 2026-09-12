# Local model assets

These files are intentionally kept out of Git because they are large local runtime assets.

| Filename | Role |
| --- | --- |
| `kokoro-v1.0.onnx` | Local text-to-speech model for MVP voice chat |
| `voices-v1.0.bin` | Kokoro voice bundle for MVP voice chat |
| `streaming-asr/sherpa-onnx-streaming-zipformer-en-2023-06-26/` | Provisional English captions and exact immediate commands |

Faster-Whisper `large-v3-turbo` is stored in the Hugging Face cache rather than
this directory. Ollama stores the normal 4B and complex 9B Qwen models in its own
model store. These external caches are intentionally not managed or deleted by
the application.
Do not rename these files without updating `config.json` and the setup/doctor checks. The MVP currently uses the portrait and bust PNGs in `public/assets/bots/`; the local model files are preserved for the conversation and voice implementation slices.
