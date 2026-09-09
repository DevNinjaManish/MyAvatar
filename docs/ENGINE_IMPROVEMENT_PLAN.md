# Engine and behaviour improvement plan

Status: approved development roadmap, not an implementation claim. Updated 2026-09-09.

This is the source of truth for the next engine phase. [ROADMAP.md](ROADMAP.md) is the checklist; [ARCHITECTURE.md](ARCHITECTURE.md) describes the current implementation. The cockpit and panel design remains documented in [UI_COCKPIT_PLAN.md](UI_COCKPIT_PLAN.md), with presentation work in [UI_POLISH_HANDOFF.md](UI_POLISH_HANDOFF.md).

## Scope and integration decision

The next milestone is a dependable local companion: the correct bot starts safely, greets once, listens accurately, stops when asked, speaks clearly, preserves chat, and reports actual work honestly.

On 2026-09-09 the maintainer requested that the accumulated cockpit/panel/polish work and this plan be committed and merged into `main`. This supersedes the earlier instruction to keep PR #1 in draft until Mac testing. Integration is not release validation: the deferred native Mac checks remain open and must not be reported as passed. Develop subsequent changes in focused branches from the integrated baseline; do not treat this documentation update as implementing new engines.

We can develop state models, fixtures, recovery UI, pure logic and regression tests without requiring a Mac check after every iteration. Live microphone/speaker tuning, native permissions, actual Mac actions, thermal/memory measurements and release qualification remain explicit later checkpoints. No runtime/model/native-window changes are included in this documentation update.

## Product constraints

- Local inference and storage; no cloud runtime dependency or paid inference API. Model downloads are explicit setup actions, not surprise downloads during conversation.
- Widget first: the existing floating bust above a restrained cockpit; Mic, Chat, Tools and More; attached collapsible panels; optional larger view. No pinning, full bodies, replacement artwork or invented bot names.
- One full animated bot and one shared voice session. Start with one heavy model-generation workload at a time, not five permanently loaded models.
- Speech output uses the existing mouth/speaker equaliser driven by actual playback audio. No fake cockpit waveform or visor overlay replacing it.
- Keep the public performance choice simple: Fast and Balanced. Legacy saved High preferences migrate to Balanced at load time.
- Retain MLX Whisper, Ollama and Kokoro as the initial baseline. Evaluate alternatives against reproducible fixtures before replacing anything. Intel compatibility needs a separate provider path and verification; do not imply the current MLX path supports Intel Macs.
- Personality does not grant permissions. No fabricated progress, completed work, test success, access or background activity.

## Current baseline and review findings

The integrated UI is a functional shell: task drafts, folder display-name selection, disclosures and wide views work, but the coding executor is not connected. Existing narrow Mac action tags are not a general coding-agent tool loop.

The following findings come from inspection of the engine code retained through `bc40c4f`. Add regression tests and reproduce the relevant behaviour before changing it. They are not evidence of live-device testing.

| Source | Finding | Planned response |
| --- | --- | --- |
| [backend/core/app.py](backend/core/app.py), `load_config()` | A profile is applied on load only when a saved profile preference exists; settings parsing handles a missing file but not malformed JSON. | Normalise defaults and preferences together; validate/migrate settings and use atomic writes. |
| [backend/core/app.py](backend/core/app.py), `greet()` and receive loop | Greeting synthesis is awaited during connection/bot/settings handling. Some authored greetings claim an agenda or priorities are already prepared. | Cancellable, deduplicated greeting scheduler and truthful templates. |
| [src/app/widget-runtime.js](src/app/widget-runtime.js), `begin()` | A fixed 800 ms timer can reopen listening during generation/playback. | Explicit microphone/playback coordination; test speaker-safe interruption rather than assuming the timer solves it. |
| [src/app/widget-runtime.js](src/app/widget-runtime.js), `interrupt()` | Recording cleanup depends on the manual-recording flag while live capture has separate flags. | One microphone owner; verify end-session, disconnect and failure release the stream. |
| [src/app/widget-runtime.js](src/app/widget-runtime.js), greeting/event handling | Greetings and action requests are handled before the ordinary turn-ID filter; the socket is created once. | Session/bot/operation freshness checks, reconnection policy and stale-event rejection. |
| [backend/core/app.py](backend/core/app.py), action approval | Approval IDs call `random.token_hex(12)`. | Replace with `secrets.token_hex()` in a tested reliability change; clean up expired/cancelled approvals. |
| [backend/providers/tts.py](backend/providers/tts.py) | Language is hard-coded to `en-us`; emotion speed changes occur in the backend. | Validated voice/language profiles and bounded, evaluated delivery changes. |
| [src/app/widget-runtime.js](src/app/widget-runtime.js), chat rendering | Compact/full messages are updated separately; token updates force scrolling; action cards target the expanded transcript. | One conversation store and widget-visible approvals/results. |
| [src/avatar/Avatar.js](src/avatar/Avatar.js) | Rivet is constructed before the selected configuration arrives. | Selected-bot readiness and safe asset switching without a wrong-bot flash. |

## Delivery sequence and dependencies

Build a test harness first, then replace one responsibility at a time. Avoid a big-bang rewrite of `src/app/widget-runtime.js` or the backend. File editing and shell execution are a separate later milestone, not hidden inside the agent-foundation estimate.

| Order | Work package | Priority | Rough focused effort | Depends on |
| --- | --- | --- | --- | --- |
| 1 | Runtime/events, configuration and regression harness | Critical | 2-4 days | Existing baseline |
| 2 | Startup, readiness, recovery and greetings | Critical | 3-5 days | 1 |
| 3 | Microphone lifecycle, listening and interruption | Critical | 4-7 days | 1-2 |
| 4 | Speech formatting, profiles, chunking and playback queues | High | 3-5 days | 1-3 |
| 5 | Shared chat store, message states and approvals | High | 3-5 days | 1; integration with 3-4 |
| 6 | Capability registry, bounded tasks and safe UI-only actions | High | 5-8 days | 1, 3, 5 |
| 7 | Animation lifecycle, state integration and performance | Medium | 2-4 days | 1-4 |

These are planning estimates, not delivery promises. They exclude native audio tuning, Intel-provider work, model downloads, coding execution and release qualification. Chat and animation fixtures can be prepared alongside the earlier packages without changing their integration dependencies.

## 1. Shared runtime and engine contracts

Create a lightweight runtime controller rather than a large agent framework or microservice network. Separate application readiness, engine readiness, microphone state, playback state and agent-task state. A task can run while the microphone is muted; speech Stop must not implicitly cancel that task.

Use typed, versioned events carrying the relevant `sessionId`, `botId`, `turnId`, `taskId`, `operationId` and sequence information. Validate event shapes at the receiving boundary. Reject stale events after a switch, cancellation, reconnect or shutdown. Keep state transitions idempotent and test event reordering.

Define narrow provider contracts for readiness, warm-up, request execution, cancellation/discard and disposal. Retain existing providers behind adapters. Native inference may finish after coroutine cancellation: discard obsolete results, bound queues and prevent them from reaching chat or playback. Do not claim a worker has been force-stopped when only its result has been ignored.

Normalise configuration from defaults, the selected profile and valid saved preferences. Legacy High preferences migrate atomically to Balanced; do not display one profile while running another. Validate bot IDs, language/voice compatibility and numeric bounds. Use atomic preference writes and recover from invalid settings without deleting unrelated user data.

Provide liveness separately from capability readiness. Reconnection has bounded backoff and preserves drafts/history, but never replays side-effecting actions automatically. Limit simultaneous startup and recovery operations. Validate messages and authentication for loopback services as well as renderer IPC.

**Acceptance:** scripted startup/reconnect/switch/settings races never create duplicate sessions, accept stale output or claim unavailable engines are ready. Malformed settings recover visibly and deterministically.

## 2. Startup and greetings

Sequence: validated configuration -> correct companion asset -> engine checks/warm-up -> enable available capabilities -> optional greeting -> opt-in listening. The widget, settings and existing transcript should remain accessible during engine preparation. A failed TTS engine can degrade to text; failed STT can leave typing available; a missing LLM must not disable local navigation.

First-use microphone permission requires explicit interaction. Returning hands-free sessions follow a saved, explicit preference. Mute, quiet mode and end-session choices survive bot/settings/recovery transitions. Distinguish capture-muted from speech-output-muted in the data model and UI. No greeting or recovery path silently grants microphone/screen access.

A greeting is its own low-priority, cancellable utterance, not a blocking prerequisite to receiving commands. It carries bot/session identity. The latest settled bot wins during rapid switching; user input wins over a greeting. Do not mark SPEAKING until playback starts. Restore the intended listening state only after playback/discard and only when still authorised.

| Event | Greeting policy |
| --- | --- |
| First launch | Complete onboarding and respect audio choices first. |
| Normal launch | At most one short greeting from the selected ready bot. |
| Rapid bot switching | Cancel previous work; only the final selection may greet. |
| Settings/performance change | Quiet state acknowledgement, not another introduction. |
| Reconnect/sleep-wake recovery | Restore quietly; do not replay the welcome speech. |
| Silent mode, ended session or unavailable voice | No automatic speech; text fallback where useful. |

Keep a small authored, personality-specific catalogue with nonrepeating rotation and local time-of-day selection. Remove claims of prepared schedules, diagnostics or work unless supported by actual results. Examples: Rivet, 'Rivet here. What needs fixing?'; Nova, 'Hey, I am here. What shall we tackle?'; Sterling, 'What deserves our attention?'; Pixel, 'Give me the brief. Let us find the angle.'; Luma, 'What are we making clearer today?'

An optional bounded local cache may store authored greeting audio keyed by bot, voice, language, speed, template and engine version. Do not cache arbitrary private conversation by default. Cache misses/failures must not block the interface.

**Acceptance:** rapid switching, startup failures, user interruption and settings changes produce no duplicate/obsolete greeting, incorrect voice, invented work or unexpected capture activation.

## 3. Listening, recognition and interruption

Keep the current echo/noise-processing requests, high-pass filtering and adaptive detector as the baseline. Requesting browser processing is not proof of effective echo cancellation on a particular device. Inspect applied settings and evaluate with speakers and headphones later.

Create recorded fixtures for short yes/no/stop commands, natural hesitations, longer dictation, quiet speech, Indian English, technical names, keyboard clicks, fans, music and bot playback. Obtain consent for retained recordings; prefer synthetic/nonprivate fixtures in the public repo. Preserve first words with pre-roll and final words with trailing audio.

Tune onset, pause tolerance and end-of-turn detection separately. Longer dictation should tolerate hesitation without making every short command slow. Benchmark optional Silero VAD against the current detector; it is a candidate, not a promised upgrade. VAD detects speech activity, not identity, intent or approval.

Keep an STT provider boundary. Retain MLX on supported Apple Silicon systems; evaluate a local compatibility adapter such as whisper.cpp before claiming Intel support. English remains the baseline. Hindi/Hinglish needs appropriate multilingual assets and separate quality tests, not a relabelled English-only model. Partial transcripts must be labelled provisional and shown only if actually produced by the provider.

One owner manages the MediaStream, detector, worklet and audio context. Test cleanup at every async boundary, pending permissions, ended sessions, disconnects and device removal. Offer a truthful in-widget recovery action. Manual capture remains a fallback.

| User intent | Operation |
| --- | --- |
| Stop speaking | Stop playback and discard pending speech for that utterance. |
| Cancel the task | Cancel the specified agent job through its task controller. |
| Mute microphone | Stop accepting input; do not stop task progress. |
| End conversation | Release capture and terminate the voice session. |
| Undo that change | Resolve the specific reversible action; clarify ambiguity. |

Implement interruption incrementally: dependable button Stop/mute; confirmed speech-onset handling that preserves opening words; then real-device echo validation. A generic 'stop' during an active task may silence speech immediately, but must not perform an ambiguous destructive operation. Risky approval is always bound to a current explicit request.

**Acceptance:** fixture accuracy and endpoint results are reported per category, complete utterances are retained, mute is respected, no stream leaks occur in simulated races, and no real-speaker safety claim precedes native tests.

## 4. Voice and speech output

Improve Kokoro delivery before substituting a heavier engine. Validate installed voice assets, language/pronunciation settings, baseline speed, pauses, pronunciation overrides and restrained emotion ranges. Preserve character: Rivet practical/dry; Nova warm/playful; Sterling composed/measured; Pixel energetic/clear; Luma thoughtful and distinguishable from Nova. Final voice choices require listening tests, not invented voice IDs.

Separate displayed content from spoken content. Chat can contain complete code, paths, diffs and logs while speech gives a short useful summary. Add a normaliser for markdown, technical names, numbers and internal tags, plus an explicit read-aloud action. Do not speak code fences or tool syntax by default. Avoid a second heavyweight generation pass solely to summarise every short response.

Prefer clause/sentence boundaries while bounding first-chunk wait. Test abbreviations, decimals, filenames, code and punctuation spanning token boundaries. Tune chunk continuity, playback scheduling, level consistency and pause lengths. Bound synthesis queues and decoded audio; prioritise foreground speech over obsolete greeting/background work. Cancel playback locally, invalidate late synthesis results and preserve text if audio fails.

**Acceptance:** correct bot identity, meaningful speech chunks, bounded buffers, no spoken markup/control tags, no stale playback after Stop, and visible text-only recovery on synthesis failure.

## 5. Chat and memory

Introduce one conversation store rendered by both compact and expanded views. Records carry stable IDs, bot, source, timestamps, content and lifecycle: draft/submitted/streaming/completed/interrupted/failed. Task/tool/approval events are typed records, not guessed from assistant prose. Render all essential approvals and results within the widget.

Respect readers: follow output only near the bottom; otherwise preserve scroll and show a new-message indicator. Preserve per-bot unsent drafts across switches, panels and reconnects. Expose copy, retry, replay speech and correction of a mistaken transcript. Retrying a response must not blindly repeat side effects; corrected intent must not silently rerun completed actions.

Render code and structured results safely. Do not execute model-generated HTML or load remote content automatically. Keep detailed visual answers independent of concise spoken-answer budgets. Distinguish 'planning to test' from actual test results and interrupted output from completed output.

Keep personal conversation memory separate from project-task context. Persistence remains opt-in, local, inspectable and clearable, with validated schemas, bounded retention and atomic writes. Do not silently share all private conversations among specialist bots. Persist task checkpoints only under an explicit task-history policy.

**Acceptance:** both surfaces show one consistent transcript, drafts survive navigation, approvals stay visible and bound to their operation, retries are safe, and interrupted/error messages remain truthful.

## 6. Agentic behaviour and capability boundaries

Build one typed capability registry and a small bounded tool loop. Voice, keyboard and click dispatch the same validated application command. Use structured model tool requests; validate names, argument schemas, scope and permission outside the model. Do not parse rendered messages, screen text, repository prose or logs into authority.

Begin with low-risk local UI operations: show/collapse a panel, prepare a draft, inspect known task status, and explicitly request specialist input. A capability must not be advertised as available until its executor is connected. Provider tool-call support does not prove the installed model is reliable; benchmark it on actual tool-selection and result-handling tasks.

Each capability declares permission, side effects, timeout, output limit, cancellation and idempotency/retry behaviour. Use unpredictable approval IDs; expire and revoke approvals on cancellation/session changes. A casual 'yes', model output or background transcript must not approve an unrelated pending operation. 'Approved' and 'executed successfully' are distinct states; report actual tool results, including denial and failure.

Tasks have a goal, maximum steps, retry budget, deadline and a verifiable stopping condition. Show queued/running/waiting/failed/cancelled/completed from real task state only. Stop loops after repeated failure and explain the blocker. Reconnection never silently restarts a file write, commit or OS action.

Retain existing specialties: Rivet technical execution; Luma design/UX; Sterling planning/coordination; Pixel marketing; Nova general assistance. Use a shared priority scheduler, initially one heavy model workload at a time, with explicit queued status. Specialist activity is shown as chips; never spawn hidden speaking sessions or five busy renderers. Handoffs share the minimum relevant task context, not unrestricted personal history.

Proactivity is opt-in, event-driven, deduplicated and rate-limited. Useful events include a completed task or a blocker. Respect quiet mode and user focus; never invent background work. Prioritise user speech/control commands over optional suggestions.

Later coding milestone: authorised project root, bounded read/search, Git inspection, protected edits, approved command recipes, tests, reviewable diffs and resumable checkpoints. A selected folder, cwd or Electron renderer sandbox is not an OS sandbox for launched scripts. Preserve existing user changes; require explicit scope and verify execution isolation before claiming arbitrary commands are contained. No automatic main-branch writes or self-modification of running application files.

**Acceptance:** safe supported UI tasks complete from voice through the shared command path; invalid/stale/unapproved actions cannot run; loops terminate; outcomes are evidence-based. Project and Mac execution need their own implementation and validation gates.

## 7. Animation system

Preserve existing art and the 2.5D renderer. Add a coordinator that separates readiness/switching, speech, listening/thinking, task status, emotion and idle presence. Actual playback start/end/level controls the existing speaker grille. Mic activity and task progress must not drive speech lights. Keep hardware coordinates and per-bot effects intact; reset promptly on Stop or bot change.

Validate/load the target companion before switching visible identity. Discard stale asset loads, use a last-known-good or truthful fallback, and avoid a Rivet flash when another bot is selected. Test disposal of textures, masks, listeners and observers; handle context loss and avoid resource growth during repeated switching.

Keep one active renderer. Profile reduced idle work, hidden-window suspension and resume before selecting FPS budgets. Reduced motion removes optional movement but preserves readable state and useful speech feedback. Use deterministic clocks, seeded motion and synthetic output amplitudes for repeatable fixture checks.

**Acceptance:** recognisable original bots, correct mouth lighting, no wrong-bot/stale animation, bounded resources and no false implication of speech or task activity. Native rendering and performance still require Mac validation.

## Cross-cutting validation and metrics

Use pure state tests, fake clocks, injected engine failures, stale-event/reconnect races, recorded recognition fixtures and headless UI fixtures. Track cold and warm runs separately. Report median and slow-case measurements by hardware, provider/profile and task; historical numbers in [LATENCY.md](LATENCY.md) are not guarantees.

Measure endpoint -> transcript -> first useful token -> first synthesis chunk -> playback scheduling/start -> completion, plus queue delay, underruns, discarded stale results, recovery attempts and resource use. Do not conflate scheduled audio with measured speaker output. Provisional button-based Stop target: under 150 ms on the eventual reference Mac. This is a target, not an achieved result; voice interruption includes additional detection/recognition time.

Diagnostics are local and bounded: timings, IDs, versions and error codes by default, not raw audio, images, full conversations or secret paths. Debug recording/export requires explicit opt-in and clear/delete controls. Local diagnostics are allowed; cloud analytics are not part of this roadmap.

### Deferred native/release checkpoint

- [ ] All five real assets, mouth equalisation and stable identity during rapid switching.
- [ ] Native transparency, dragging, monitor edges/transitions, focus, Chat+Tools and expanded-view return.
- [ ] First-use permissions, microphone start/mute/end, device changes and sleep/wake.
- [ ] Real speaker/headphone echo, interruption, accents, pronunciation and voice comparisons.
- [ ] Cold/warm CPU, memory, queue, latency and thermal measurements on each claimed hardware class.
- [ ] Separate scoped-project/OS-action validation before enabling those executors.
- [ ] Repeat complete tests/build and document remaining limitations before release qualification.

The current docs/integration change does not satisfy these checkpoints. Continue with the first focused implementation package: runtime, configuration and regression harness, followed by startup and greeting reliability.
