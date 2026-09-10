# Startup + Greeting Reliability

This batch tightens automatic greeting behavior without expanding bot authority.

- Startup greetings remain gated behind the runtime `ready` event and only run when speech capability is available.
- User turns, stop, settings, clear, bot switches, onboarding, and coding inspection continue to cancel pending greetings before work proceeds.
- Greeting text is now reason-aware: startup, bot switch, onboarding, and idle-return each use distinct authored phrasing.
- Pending greetings capture the selected bot identity and are discarded if that identity changes before synthesis or delivery completes, even if an explicit cancellation were missed.
- Startup remains one greeting per session plus the existing reconnect cooldown.
- Idle-return phrasing is supported by the coordinator but is not triggered automatically; MyAvatar will not speak just because the user was inactive.
- Rotation state advances only after a greeting is actually delivered.

Automated coverage includes ready-before-startup-greeting ordering, cancellation when a user turn begins, stale bot identity rejection, rapid bot switching, truthful templates, reason-specific selection, and nonfatal TTS failure.

Native speaker timing and subjective greeting quality still require live Mac testing.
