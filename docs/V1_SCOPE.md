# MyAvatar V1 scope

## In scope

### Shared companion

- Compact 2.5D companion widget
- Common chat for every bot
- Typed and voice conversation
- Natural listening, speaking, interruption, and recovery
- Bot-specific voice, emotion, animation, lighting, sound, and reactions
- Persistent relationship memory with inspect, correct, forget, and clear controls
- Summarized activity history with limited retention
- Proactive reactions and occasional initiative with quiet, focus, pause, mute, and “not now” controls

### Bots

- Nova as the default bot
- Rivit, Sterling, and Luma as deeply authored V1 bots
- Shared bot framework with distinct persona, voice, memory, emotional model, context policy, and capabilities
- Bounded background delegation between bots
- Visual specialist cues and system banners for delegated work

### Context

The following are the V1 target context surface. They are introduced in phased slices, not all in the first implementation batch. Each source must have its own permission, collector, fallback, tests, and visual/user explanation.

- Time and weather
- Current app and window
- Projects and workspaces
- Git repositories
- Calendar and reminders
- Files and folders
- Browser context
- System state
- Seeing Eye screen awareness with intermittent snapshots while enabled

### Specialist panels

- Nova assistant panel for calendar, reminders, planning, and everyday tasks
- Sterling assistant panel with the same foundation as Nova
- Rivit coding-agent panel for project and Git understanding, file inspection, explanations, prepared patches/commands, and narrowly approved safe checks
- Luma image-generation and image-editing panel

### Runtime and setup

- Local model provider abstraction
- Small model bundles and automatic model/runtime setup
- Fast and Balanced profiles
- Apple Silicon and Intel Mac support
- 8 GB minimum target for the core voice/chat experience and 16 GB preferred target for richer context, panels, and model quality
- Real-time local voice with hybrid TTS and authored nonverbal audio
- Interruptible asynchronous background jobs
- Tiered observation, preparation, and action permissions
- Beginner-friendly installation, onboarding, repair, and settings

### QA

- Code QA: contract, unit, integration, native, performance, and soak tests
- Visual QA: layout, 2.5D rendering, animation, liveness, audio visualization, sound cues, banners, panels, and recovery states
- Core MVP regression path required after every batch

## Out of scope for initial V1

- Pixel and Ledger bots
- Full-screen general-purpose agent workspace
- Unrestricted autonomous terminal access
- Destructive coding actions without confirmation
- Permanent raw screen recording or all-action surveillance log
- Cloud model dependency or account system
- Multi-user sync and remote relationship storage
- Mobile clients
- Marketplace or custom bot authoring
- Audible bot-to-bot conversations by default
- Complex dashboards beyond the simple specialist panels

## Quality gate

V1 is not complete until the core companion loop is stable across supported hardware, voice remains interruptible, specialist panels are useful without taking over the product, memory and permissions are trustworthy, setup works for a beginner, and both automated code QA and native visual QA pass.
