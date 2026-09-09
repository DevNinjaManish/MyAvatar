# MyAvatar

MyAvatar is a free, local-first macOS robot companion. Five original bots use MLX Whisper for speech-to-text, Ollama for conversation, Kokoro for speech, and an animated Electron widget for presence.

No paid runtime API is required. The app's local services bind to `127.0.0.1`; microphone audio, conversation and inference stay on the Mac in the supplied configuration. Model downloads are an explicit setup step.

## Development status

This is a source-run development build, not a signed or release-qualified application. The cockpit, attached coding panels and UI polish are the current UI foundation. The local coding helper now runs a limited allowlisted command set for project-level actions (build/test/git inspection/commit) from the selected project folder, with strict approval controls. It does not yet read/write files directly or perform general-purpose code editing.

The next approved milestone is engine and behaviour reliability: startup, greetings, listening, speech, chat, safe agent foundations and animation lifecycle. Read [ENGINE_IMPROVEMENT_PLAN](docs/ENGINE_IMPROVEMENT_PLAN.md) for the full plan and [ROADMAP](docs/ROADMAP.md) for the checklist. Planned capabilities are not enabled by adding these docs.

The maintainer authorised integration of PR #1 into `main` while native Mac testing remains deferred. Automated tests/build and native qualification are distinct: live audio, permissions, all five animated bots, monitor transitions and hardware performance still need the checks documented in the plan.

## What it does

- Draggable compact widget with an existing floating bot bust over a restrained cockpit base.
- Four persistent controls: Mic, Chat, Tools and More. Speech Stop is contextual beside status; microphone/mute stays available during speech.
- Attached expandable/collapsible Task, Files/Changes, Terminal, Tests and Git/Diff panels, with a wider file/diff view and keyboard navigation.
- Chat and Tools can stay open together. The optional expanded conversation uses the same renderer/audio session.
- Task drafting with unsent-chat protection; a project-aware native folder picker that switches the local project context used by the allowed commands; clear unavailable/empty states rather than fabricated coding results.
- Task panel includes a local agent mode that runs a deterministic command plan derived from your brief (build/test/status/diff/optional commit) with local approval rules.
- Local microphone conversation with automatic turn detection and a manual fallback.
- Speaker-grille equalisation driven by output audio, camera shutters, breathing, listening/thinking motion and per-bot expressions.
- Existing short greetings after launch/bot/performance changes. A quieter, cancellable greeting policy is planned.
- Persistent selected bot, microphone mode and performance mode in ignored local settings.
- Opt-in screen awareness from More; raw frames are discarded and only derived comments enter the local activity log.
- Click reactions and an icon-based companion picker.

## Bots

| Bot | Identity | Focus |
| --- | --- | --- |
| Rivet | Weathered teal/orange repair robot | Coding, debugging, architecture and technical troubleshooting |
| Nova | Rose assistant | Proactive everyday assistance and planning |
| Sterling | Navy/gold butler | Priorities, plans and communication |
| Pixel | Pink/lime marketer | Content, campaigns, positioning and growth ideas |
| Luma | White/cyan designer | Product design, UX, visual systems and creative direction |

These are the existing identities. Specialist roles do not imply that project execution, image generation or external integrations are already implemented.

## Quick start

The current MLX recognition path targets Apple Silicon Macs. Intel compatibility is an evaluation item, not a verified current capability.

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

Check that the Mac, local services, models and speech assets are ready with `npm run doctor`. The report stays on the Mac and identifies missing prerequisites.

Download Fast and Balanced for the normal experience. Approximate model downloads are 1 GB for Fast and 3.3 GB for Balanced; speech assets add roughly 500 MB. Download size is not runtime memory use.

```sh
ollama pull huihui_ai/qwen3.5-abliterated:0.8b
ollama pull huihui_ai/qwen3.5-abliterated:4b
.venv/bin/python scripts/download_models.py
```

Create a double-click launcher:

```sh
npm run app
```

Double-click `MyAvatar.app` in the cloned folder. Keep it with the project. If launch fails, see `~/Library/Logs/MyAvatar-launcher.log`. For development, use `npm start`.

## Performance modes

Open Performance or Settings from More. These are the currently configured profiles, not measured latency/FPS guarantees:

| Current mode | LLM | Intended use |
| --- | --- | --- |
| Fast | `huihui_ai/qwen3.5-abliterated:0.8b`, 2K context, 45 FPS cap | Lighter everyday operation |
| Balanced | `huihui_ai/qwen3.5-abliterated:4b`, 4K context, 60 FPS cap | Everyday voice conversation |

MyAvatar supports **Fast and Balanced only**. Existing saved `High` preferences are migrated to Balanced atomically when loaded. Compact dimensions do not depend on the chosen profile. Current mode switching greets and resumes the existing hands-free flow; the plan replaces repeated introductions with quiet confirmation while preserving explicit mute/listening choices.

## Use and privacy

Onboarding explains the local-only design and lets you choose a companion and performance mode. Microphone capture requires macOS permission; the exact first-use and resume lifecycle is part of the outstanding native validation and reliability work. Speak, then pause briefly to submit a turn. In the widget, the microphone button starts listening and becomes the mute/unmute toggle; End voice conversation remains in More. Stop interrupts the current speech response.

The display shows Listening, Thinking and Speaking. Setup, microphone, connection and runtime errors also appear in widget chat with an unread badge. A shared readiness/recovery model and widget-visible agent approvals are planned; do not infer engine health solely from appearance.

Companions can mark a reply as Happy, Sad, Relaxed, Surprised or Curious. MyAvatar uses that signal for expression, voice pacing and a mood badge. The normal emotion-control tag is removed from displayed/spoken replies.

More -> Screen awareness enables observation. It takes an immediate snapshot and observes again after an idle interval while enabled. Images are passed to the configured local Ollama service, discarded after the turn and not added to conversation memory. Derived comments are stored in ignored `data/screen-awareness/events.jsonl`. Screen content must not authorise actions.

[`config.json`](config.json) contains provider defaults, prompts, voices, profiles and VAD tuning. Voice activation adapts to steady ambient noise and rejects short transients; quiet microphones or loud rooms may need tuning of `audio.vad.threshold`, `noiseMultiplier` and `minSpeechMs`. Runtime choices save to ignored `data/settings.json`; no paid API key is required. Conversation memory is off by default and can be enabled in Settings; it stays in ignored local files. See [SECURITY](docs/SECURITY.md).

## Validation

```sh
npm test
.venv/bin/python -m unittest discover -s tests/py -p 'test_*.py'
npm run build
```

GitHub Actions reported successful JavaScript tests, Python tests and production build for the pre-documentation UI baseline `bc40c4f` ([run](https://github.com/DevNinjaManish/MyAvatar/actions/runs/34356589056)). Check the run for the exact commit you use. The earlier isolated browser fixtures used static artwork and mocked desktop/voice interfaces; they are not live Electron/audio certification.

Native Mac checks remain deferred: transparency/dragging, both monitor edges, multi-monitor transitions, all five live bots, real mouth equalisation, mic/mute/Stop, echo/interruption, folder cancellation and returning from expanded conversation. No new live-device or latency result is claimed by the roadmap update.

## Limitations and next work

The speech path is English-first. Reliable speaker-safe full-duplex interruption, per-engine readiness/recovery, greeting deduplication, a shared chat store and structured agent tools are planned. Existing timer-based listening behaviour and narrow action tags should not be presented as a validated general agent system.

The next implementation package is runtime/configuration regression coverage, followed by startup and greeting reliability. Coding execution is now partially integrated (allowlisted command runner) and still limited by fixed commands and local scope. Native testing remains deferred, not silently waived for release.

## Documentation

- [Engine and behaviour plan](docs/ENGINE_IMPROVEMENT_PLAN.md): priorities, dependencies, acceptance criteria and deferred checks.
- [Roadmap](docs/ROADMAP.md): implemented baseline and open work.
- [Architecture](docs/ARCHITECTURE.md): current modules and future boundaries.
- [Widget cockpit](docs/UI_COCKPIT_PLAN.md) and [UI polish handoff](docs/UI_POLISH_HANDOFF.md): visual constraints and UI implementation history.
- [Latency notes](docs/LATENCY.md): historical development observations, not current guarantees.

MyAvatar is released under the [MIT License](LICENSE). See [CONTRIBUTING](docs/CONTRIBUTING.md) for contribution guidance.
