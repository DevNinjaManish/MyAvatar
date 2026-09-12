# MyAvatar V1 high-fidelity mockups

This folder contains deterministic implementation references derived from the
V1 structural wireframes. The canonical gallery is
[`v1-core-surfaces.html`](v1-core-surfaces.html); the checked-in
[`v1-core-surfaces.png`](v1-core-surfaces.png) is its stable visual QA capture.

## Surface map

| Gallery section | Wireframes covered | States represented |
| --- | --- | --- |
| Companion states | 01, 02 | Ready, Listening, Understanding, Paused |
| Conversation | 01, 02, 08 | Voice chat, context provenance, background work, interruption |
| Setup and settings | 09, 10 | Profile recommendation, download, runtime health, repair |
| Memory, context and trust | 03, 04 | Memory list, source status, Seeing Eye, scoped permission |
| Specialist surfaces | 05, 06, 07 | Assistant conflict, safe project check, creative variants |

## Visual QA result

Checked at 1600 px reference width on 2026-09-12. All five boards render
without overlap, clipped controls, missing portraits, or unreadable labels.
Compact companion controls keep identical geometry between states. The source
HTML remains authoritative for exact text and spacing; the PNG is the review
fixture.

These are design references, not implemented screens. Interaction, failure,
responsive, keyboard, and reduced-motion behavior remains governed by the
linked wireframes and V1 specifications.
