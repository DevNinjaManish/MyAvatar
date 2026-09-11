# Security policy

## Supported version

Security fixes are made on the latest `main` branch.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or an exposed credential. Contact the repository owner privately through GitHub with the affected version, reproduction steps, impact, and any suggested mitigation.

## Locality and secrets

The MVP foundation has no network service, account, telemetry, screen capture, filesystem agent, or external integration. The native bridge is limited to widget drag, minimize, and close. Future conversation services must remain loopback-only and use a per-launch in-memory token.

The repository must not contain `.env` files, private keys, model weights, microphone recordings, transcripts, logs, or generated build output. Optional audio must be explicit, permission-gated, and unable to block typed chat.
