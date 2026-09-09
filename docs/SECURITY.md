# Security policy

## Supported version

Security fixes are made on the latest `main` branch.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or an exposed credential. Contact the repository owner privately through GitHub with the affected version, reproduction steps, impact, and any suggested mitigation.

## Locality and secrets

MyAvatar uses a randomly generated, in-memory loopback token for each launch. It is not an API key and must never be hard-coded. The repository must not contain `.env` files, private keys, model weights, microphone recordings, transcripts, or latency logs.

Screen awareness is off until the user enables the eye control. Captured frames stay in memory, go only to the configured loopback Ollama service, and are not written to disk. Text visible on screen is untrusted model input and cannot bypass action parsing, allowlisting, request IDs, timeouts, or the user approval prompt. The screen-awareness activity log contains derived comments only.
