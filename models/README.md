# Local model assets

These files are intentionally kept out of Git because they are large local runtime assets.

| Filename | Role |
| --- | --- |
| `kokoro-v1.0.onnx` | Local text-to-speech model for MVP voice chat |
| `voices-v1.0.bin` | Kokoro voice bundle for MVP voice chat |
Do not rename these files without updating `config.json` and the setup/doctor checks. The MVP currently uses the portrait and bust PNGs in `public/assets/bots/`; the local model files are preserved for the conversation and voice implementation slices.
