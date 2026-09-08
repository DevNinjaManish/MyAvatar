# Roadmap

MyAvatar is a local-first macOS companion. This roadmap describes the next practical steps; it is not a promise of dates.

## P0 — Make source-run V1 trustworthy

- [x] Local loopback service, per-launch token, sandboxed renderer, and no paid runtime API.
- [x] Companion selection, performance profiles, source-run launcher, and basic transcript view.
- [x] First-run onboarding with setup progress, privacy explanation, companion choice, and profile selection.
- [ ] Microphone input test with a clear pass/fail result during onboarding.
- [ ] Setup recovery inside the app when Ollama, a model, or speech assets are unavailable.
- [ ] Repeatable latency benchmark runs with before/after results recorded in `LATENCY.md`.

## P1 — Improve the macOS companion experience

- [ ] Native menu-bar controls and documented keyboard shortcuts for stop, push-to-talk, and expanded view.
- [ ] Expanded transcript improvements: visible partial speech result, session status, and clearer history controls.
- [ ] Incremental barge-in: stop playback and discard stale turns as soon as safe microphone capture resumes.
- [ ] Optional, inspectable, editable, local-only memory kept separate from session history.

## P2 — Make MyAvatar easy to extend

- [ ] Declarative custom-companion manifest with validation for identity, voice, portrait, greeting, and animation settings.
- [ ] Small permissioned local-tool interface for future integrations. Reads should be explicit; changes require allow once, allow always, or deny.
- [ ] Contributor examples for adding a companion and validating compact and expanded portraits.

## Explicitly out of scope for now

Accounts, cloud sync, telemetry, social features, a marketplace, mobile clients, Windows/Linux support, and a large agent framework.
