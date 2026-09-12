# MyAvatar V1 onboarding and settings

## Product requirement

Someone with no technical background should be able to install MyAvatar, start a voice conversation, choose a bot, and understand the important settings without using Terminal, reading model documentation, or troubleshooting dependencies manually.

## First-run experience

The setup flow should be a short guided sequence:

1. Welcome and explanation of what MyAvatar does locally
2. Automatic Mac and hardware detection
3. Automatic installation or download of the smallest suitable runtime and models
4. Automatic selection of Fast or Balanced mode with a plain-language explanation
5. Microphone and speech-output check
6. Optional context permissions explained one at a time
7. Seeing Eye explanation and explicit initial off state
8. Choose a default bot
9. Short voice introduction and first conversation

The user should always see what is happening, how long a download may take, and whether they can continue using typed chat while setup completes.

## Setup behavior

- No Terminal required
- No manual model-path configuration
- No unexplained dependency errors
- Automatic retry and repair for incomplete setup
- Clear disk-space and memory estimates before large downloads
- The complete local model option may use approximately 20 GB; the user must explicitly choose it or continue with a smaller core bundle
- Resume interrupted downloads
- Verify model and runtime health after installation
- Offer a beginner-safe reset or repair flow
- Preserve conversation and memory unless the user explicitly chooses to clear them

## Permission language

Permissions use plain language and explain the value before asking:

- “Allow Nova to read your calendar so she can help plan your day?”
- “Turn on Seeing Eye so the companion can understand what is on your screen?”
- “Allow Rivit to read this project so he can help with the code?”

Read access and action access are separate. The user can skip any permission and continue with a useful reduced experience.

## Settings structure

Keep the main settings small and understandable:

- **Voice:** microphone, voice output, volume, voice speed
- **Companion:** default bot, bot switching, personality preferences
- **Presence:** proactivity, quiet hours, focus mode, idle behavior
- **Memory:** view, correct, forget, retention, clear history
- **Context:** Seeing Eye and other source permissions
- **Performance:** Fast, Balanced, and automatic selection
- **Privacy and control:** pause, mute, permissions, reset

Advanced model, debug, cache, and runtime controls are hidden under an Advanced section and should not be required for normal use.

## Recovery

Every failure state should say:

- What happened in plain language
- Whether the user can continue
- What MyAvatar will try automatically
- The one recommended next action
- A secondary Help or Details option

The user should never be left at a dead-end error screen.

## Success criteria

On a clean supported Mac, a beginner can complete setup and make a first voice turn without Terminal commands, model research, manual dependency installation, or unexplained configuration choices.
