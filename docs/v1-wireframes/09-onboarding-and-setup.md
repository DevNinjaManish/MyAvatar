# V1 Wireframe 09 — Onboarding and setup

Journey: welcome → hardware/profile → runtime and voice checks → permissions → first conversation.

```text
┌────────────────────────────────┐
│ Welcome to MyAvatar            │
│ Local-first. Voice-first.      │
│                                │
│ [Continue]                     │
└────────────────────────────────┘

Your Mac is best suited to Fast.
Fast keeps conversation responsive.
[Use Fast] [Choose Balanced]

Downloading conversation model  62%
[Pause]                         [Cancel]

Test microphone       [Start]
Test speaker          [Play]
Optional context     [Review]
```

Rules:

- No Terminal, manual model paths, or unexplained technical errors in the normal path.
- Downloads resume after interruption and expose repair/retry.
- The user can use typed chat if voice setup fails.
- Seeing Eye starts off; optional permissions are explained separately and narrowly.
- Nova introduces herself only after the core runtime is ready.

QA: clean install, 8 GB Fast, 16 GB Balanced, 20 GB complete bundle, interrupted download, disk shortage, microphone denial, speaker failure, offline setup, retry, repair, and first-turn completion.
