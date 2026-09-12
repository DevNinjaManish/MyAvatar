# MyAvatar V1 design deliverables

The structural wireframes are complete. This document defines the remaining
design work required before each surface is considered design-ready.

## Shared visual foundation

- [ ] Final compact-widget geometry and responsive expanded-chat geometry
- [ ] Shared typography, spacing, controls, banners, status labels, and focus states
- [ ] Fast and Balanced visual reduction rules
- [ ] Reduced-motion and muted-audio rules
- [ ] Error, unavailable, recovery, and permission visual language

## Companion and voice

- [x] Shared high-fidelity reference for Ready, Listening, Thinking, Speaking, and recoverable Error across all four bots
- [ ] Extend the shared reference with Working, Sleeping, and Recovery
- [ ] Motion timing and interruption specification for each state
- [ ] Audio-reactive mouth and equalizer behavior reference
- [ ] Nova, Sterling, Rivit, and Luma expression and lighting parameters
- [ ] Layered asset breakdown and final asset slots

## Context, memory, and trust

- [ ] Context status and Seeing Eye permission screens
- [ ] Memory list, detail, edit, forget, and clear flows
- [ ] Action approval, denial, cancellation, and retry states
- [ ] Provenance, freshness, and degraded-source indicators

## Specialist surfaces

- [ ] Nova/Sterling assistant panel
- [ ] Rivit coding panel with safe-command review
- [ ] Luma creative panel with reference and output states
- [ ] Delegation banner, detail, question, permission, completion, and failure states

## Setup and recovery

- [ ] First-run welcome and local-processing explanation
- [ ] Hardware/profile selection and model download progress
- [ ] Microphone/speaker test and typed fallback
- [ ] Settings home and category screens
- [ ] Runtime health, repair, reset, and migration states

## Required artifact for every surface

Each surface needs:

1. A high-fidelity mockup covering the default and failure states.
2. A motion/behavior specification covering timing, interruption, reduced motion, and audio behavior.
3. A visual QA fixture with a stable name and expected state.
4. A link from the corresponding structural wireframe.

The existing provisional bot art remains usable for implementation and QA while
the final layered visual replacement pass is pending. The approved direction
reference is [`design-references/v1-companion-state-reference.png`](design-references/v1-companion-state-reference.png);
it is not itself a production spritesheet.
