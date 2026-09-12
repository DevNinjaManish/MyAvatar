# MyAvatar V1 design deliverables

The structural wireframes are complete. This document defines the remaining
design work required before each surface is considered design-ready.

## Shared visual foundation

- [x] High-fidelity compact-widget and expanded-chat geometry reference
- [x] Shared typography, spacing, controls, banners, and status labels
- [x] Fast/Balanced and reduced-motion asset rules documented in `V1_ASSET_MANIFEST.md`
- [x] Error, recovery, runtime health, and permission visual language represented

## Companion and voice

- [x] Shared high-fidelity reference for Ready, Listening, Thinking, Speaking, and recoverable Error across all four bots
- [x] Extend the shared reference with Working, Sleeping, and Recovery
- [x] Motion timing and interruption specification for each state in `V1_MOTION_SPEC.md`
- [x] Audio-reactive mouth and equalizer implementation plus Speaking fixture
- [ ] Nova, Sterling, Rivit, and Luma expression and lighting parameters
- [x] Layered asset breakdown and final asset slots in `V1_ASSET_MANIFEST.md`

## Context, memory, and trust

- [x] Context status and Seeing Eye permission core screens
- [x] Memory home/list visual direction
- [ ] Memory detail, edit, forget, clear, and action denial/cancellation/retry high-fidelity variants
- [ ] Provenance, freshness, and degraded-source indicators

## Specialist surfaces

- [x] Nova/Sterling assistant panel core state
- [x] Rivit coding panel with safe-command review core state
- [x] Luma creative panel with output-selection core state
- [ ] Delegation banner, detail, question, permission, completion, and failure states

## Setup and recovery

- [ ] First-run welcome and local-processing explanation
- [x] Hardware/profile selection and model download progress
- [ ] Microphone/speaker test and typed fallback
- [ ] Settings home and category screens
- [x] Runtime health and repair entry state
- [ ] Reset and migration high-fidelity variants

## Required artifact for every surface

Each surface needs:

1. A high-fidelity mockup covering the default and failure states.
2. A motion/behavior specification covering timing, interruption, reduced motion, and audio behavior.
3. A visual QA fixture with a stable name and expected state.
4. A link from the corresponding structural wireframe.

The existing provisional bot art remains usable for implementation and QA while
the final layered visual replacement pass is pending. The approved direction
reference is [`design-references/v1-companion-state-reference.png`](design-references/v1-companion-state-reference.png);
the extended state reference is
[`design-references/v1-companion-extended-states.png`](design-references/v1-companion-extended-states.png).
Neither is itself a production spritesheet. The UI gallery and QA capture are in
[`design-mockups/`](design-mockups/).
