# Contributing

Keep changes small, local-first, and easy to validate. Read the [V1 documentation index](README.md) before changing product behavior.

## Rules

1. Keep one compact widget window; do not add a full-screen or parallel UI shell.
2. Keep the renderer focused on presentation and intent. Native window authority stays in `electron/`.
3. Keep optional audio from blocking typed chat.
4. Do not commit credentials, logs, recordings, model weights, build output, or local state.
5. Add focused tests for behavior changes and run `npm test` plus `npm run build`.
6. Update the V1 docs when scope, acceptance, architecture, or UI behavior changes.

## Pull requests

Describe the user-visible change, the V1 contract it supports, and validation performed. Preserve the approved companion identities and avoid third-party character likenesses or logos.
