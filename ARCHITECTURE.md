# Architecture

Electron hosts a sandboxed renderer. Three.js/WebGL renders the included art-directed 2.5D robot portraits with embedded dynamic hardware effects. The frontend connects via a per-launch token to a Python WebSocket service bound to 127.0.0.1. No public listener, remote scripts, or cloud API is needed.

```
electron/main.cjs                 circular transparent widget / expanded controls window
electron/preload.cjs              narrow window-mode IPC bridge
src/avatar/Avatar.js             shared scene and portrait lifecycle
src/avatar/PortraitFace.js       portrait texture, speaker-grille LEDs, camera shutter animation
public/assets/bots/              included Rivet, Nova, Sterling, Pixel, and Luma portraits
src/audio/engine.js              noise-suppressed capture, high-pass filter, resampling, playback analyser
src/audio/vad.js                 adaptive noise floor, transient rejection, turn detection, silence trimming
public/capture-worklet.js        microphone PCM extraction
src/conversation/state.js        IDLE / LISTENING / THINKING / SPEAKING
src/main.js                     UI and turn orchestration
backend/stt/provider.py          MLX Whisper
backend/tts/provider.py          persistent Kokoro ONNX engine
backend/llm/provider.py          Ollama streaming HTTP client
backend/conversation/chunks.py   sentence-sized synthesis chunks
backend/app.py                  WebSocket/session history/cancellation/logging
config.json                     provider, bot, and Fast/Balanced/High profile defaults
data/settings.json               ignored local bot/profile/microphone preferences
scripts/start.mjs               starts and stops child services
```

## Flow

Microphone → AudioWorklet → local turn detector (or manual capture) → resample to mono 16 kHz float PCM → local WebSocket → MLX Whisper → Ollama token stream → sentence queue → Kokoro WAV → Web Audio → analyser RMS → embedded robot speaker-grille equalizer.

Opt-in screen awareness uses a narrow preload IPC call to capture a downscaled image of the active display. The frame is passed in memory to the local Ollama vision message, then discarded. Screen text is explicitly treated as untrusted and cannot emit action requests. Only the generated comment, companion, source label, and timestamp are written to the separate ignored screen-awareness log.

STT and TTS each use a dedicated single-thread executor. The token producer and speech consumer run concurrently with bounded queueing. Models remain loaded across turns for lower latency. History is owned per connection. An optional whitelisted leading emotion tag sets the face without waiting for a separate classification call. The backend removes this control tag before streaming visible text, synthesis, history, or screen logs; the renderer presents the mood as an emoji-labelled badge beside the companion name.

Each client turn has an increasing identifier. Stop increments it, empties queued playback, stops the source node, and cancels the backend coroutine. Late messages and decodes from earlier turns are ignored. In-flight native inference cannot be forcibly terminated; its result is discarded. Settings and clear-history also cancel current work.

## Locality

Microphone is opened only on user activation and tracks stop when recording ends. No camera access is requested. Runtime model providers are loopback/cached. Model downloads are an explicit setup step. Settings do not modify files; config.json supplies persistent defaults. Transcript history is session-only; normal logs contain timing and error diagnostics. The benchmark intentionally writes synthetic transcript/answer data locally.

## Scope

This is a small source-run desktop V1. There is no database, container, agent framework, or remote service. Optional conversation memory uses local JSON files and is disabled by default. Future VAD and memory should fit in audio/conversation without changing the avatar interface.

## Current appearance

The widget ships five original robot portraits: Rivet, Nova, Sterling, Pixel, and Luma. Each portrait contains only functional robot hardware such as camera optics, speaker grilles, microphone ports, status lights, panel seams, and service modules. Dynamic equalizers and camera shutters are drawn into the matching illustrated hardware texture rather than floated over the widget as UI. Equalizers are gated to the speaking state so a listening companion does not appear to be talking. No television artwork, character model, show dialogue, or imitated actor voice is used. This records design choices, not a legal clearance or guarantee.

The expanded controls window and circular widget share one renderer/audio session without reconnecting or losing conversation history.

Hands-free mode keeps one MediaStream open until the user turns it off. Capture gates close before transcription and remain closed throughout response generation/playback. The gate reopens after playback plus a short echo-settling interval. This is sequential hands-free conversation, not full-duplex voice barge-in. Browser voice processing and a 95 Hz high-pass filter reduce echo and low-frequency room noise. The detector learns a local ambient floor, requires sustained speech onset, rejects impulse clicks and brief bursts, and bounds silence buffering. Stop, disconnect, and errors close the stream.
