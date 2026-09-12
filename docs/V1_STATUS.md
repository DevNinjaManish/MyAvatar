# MyAvatar V1 status and execution plan

This is the current V1 execution summary. The V1 documentation set is the
source of truth; this file distinguishes documented decisions from implemented
and validated product behavior.

## Current state

| Area | Status | Evidence or next proof |
| --- | --- | --- |
| V1 product direction and scope | Documented | `V1_VISION.md`, `V1_SCOPE.md`, `V1_PRODUCT_BRIEF.md` |
| Runtime contracts and provider registry | Implemented | JavaScript contract tests pass |
| Hardware/profile detection | Implemented | RAM-based Auto selection, More-menu Fast/Balanced override, persistence, and profile unit tests pass |
| Local conversation service integration | Implemented | MVP WebSocket path preserved; build/tests pass |
| Provider timeout and cancellation | Implemented | Hard timeout/cancellation runner tests and runtime smoke pass |
| Runtime health and reconnect recovery | Implemented | Typed health event, bounded provider probe, and automatic reconnect path pass |
| Platform controls and compact geometry | Implemented | Pause/Resume, More, permanent local runtime rail, runtime health, hide, quit; native visual QA passes |
| V1 documentation consolidation | Implemented | Active docs are V1-only; former MVP docs are archived |
| Structural wireframes | Complete | Ten V1 wireframes exist |
| High-fidelity visual designs | Core batch complete; variants remain | Five-board UI gallery covers all ten wireframes; both four-bot state references exist; production layered assets and secondary failure variants remain |
| Motion and behavior specifications | Core implementation complete | Nine shared states have deterministic transitions, runtime mapping, Fast/Balanced reduction, reduced-motion behavior, and four-bot visual fixtures |
| Streaming voice turn manager | Implemented; human qualification pending | Continuous launch listening, provisional captions, clause streaming, Fast English / Balanced multilingual STT, bot TTS, and explicit Understanding state are connected; real-microphone Hinglish and repeated-turn soak remain |
| Memory and context systems | Not started | Implement local stores, collectors, permissions, and retrieval |
| Specialist panels and delegation | Contracts only | Build after core context and action boundaries |
| V1 acceptance qualification | Not started | Track evidence in `V1_ACCEPTANCE_MATRIX.md` |

## Execution order

1. Qualify and tune the current voice loop with real microphone Hindi, English, and Hinglish recordings, repeated turns, noisy rooms, and pauses. Keep acoustic barge-in disabled until semantic interruption is qualified.
2. Convert the approved activity-state reference into deterministic production state behavior and complete Working, Sleeping, and Recovery references.
3. Implement local memory, context provenance, permission controls, and inspect/forget flows.
4. Complete and blind-test Nova, Sterling, Rivit, and Luma behavior and voice identity.
5. Build specialist panels, action approval, jobs, and delegation.
6. Run hardware, setup, visual, performance, soak, and daily-use qualification.

## Batch checkpoints

- Batch 0: V1 foundation and documentation consolidation — complete (`0fa5fe7`)
- Batch 1: Runtime resilience — complete (`64f7253`)
- Batch 2: Continuous voice launch slice — implemented; native clean-launch and typed speech QA pass
- Batch 3: Responsive multilingual voice and visual-state direction — implemented (`80f547c`); 92 tests and production build pass; real-microphone Hinglish and repeated-turn soak remain
- Batch 4: Focused V1 design package — complete; core-surface HTML/PNG gallery, Working/Sleeping/Recovery character reference, asset manifest, wireframe links, and visual QA record added
- Batch 5: Production companion-state foundation — complete; Ready, Listening, Understanding, Speaking, Working, Paused, Sleeping, Error, and Recovery are implemented and visually qualified across all four bots

## Next recommended batch

Run a real-microphone voice qualification loop before expanding feature scope:

1. Capture a small local QA corpus from the actual microphone: short English,
   Hindi, and Hinglish turns; quiet speech; natural pauses; names; commands; and
   interruption while Nova is speaking. Keep recordings temporary unless the
   user explicitly chooses to retain them.
2. Record endpoint, recognition, first-token, first-audio, and interruption
   latency separately so tuning targets the correct stage.
3. Add vocabulary hints and conservative repair rules only for observed errors;
   compare Fast and Balanced recognition without slowing every turn.
4. Run a 20-turn continuous conversation and noisy-room soak, then document the
   error rate, dropped turns, false activations, and subjective naturalness.
5. Fix the measured failures and repeat native visual/audio QA.

Exit: ordinary English/Hindi/Hinglish turns are understood reliably on the
creator machine, simple replies begin without dead air, longer work uses a
contextual persona fallback only when needed, and interruption remains fluid.

## Definition of “documented” versus “done”

V1 is documented when the scope, user journey, wireframe, failure behavior,
acceptance evidence, and design deliverables are specified. A feature is done
only after implementation, automated tests, native or visual QA where
applicable, and acceptance evidence pass.
