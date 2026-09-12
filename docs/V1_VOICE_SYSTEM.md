# MyAvatar V1 voice system

## Voice decision

Implementation evidence and explicit limitations are tracked in
[V1_VOICE_QA.md](V1_VOICE_QA.md). The performance goals below describe the
full V1 target; they are not a claim that authored nonverbal sounds or nuanced
prosody are already implemented.

V1 is voice-first. Listening, thinking, speaking, interruption, silence, and nonverbal expression must feel like a natural live interaction. Each bot has a unique voice performance based on persona, not merely a different pitch or voice preset.

V1 uses a hybrid local voice stack:

- Local real-time TTS for spoken words and fast conversational response
- Authored local vocal assets for laughs, breaths, sighs, gasps, hums, yawns, coughs, and other character-specific nonverbal moments
- Local effects and mixing for spatial presence, emphasis, and bot identity

The hybrid system keeps the primary speech loop responsive while allowing richer performances than generated speech alone can reliably provide.

## Natural conversation loop

The voice loop should support:

- Fast response onset after the user finishes speaking
- Barge-in while the bot is talking
- Immediate speech cancellation when interrupted
- Natural pauses without appearing stuck
- Short acknowledgements while processing
- Backchannel reactions when appropriate
- Robust recovery from unclear or partial speech
- Continued listening after a response when the conversation remains active

The bot should not require a rigid push-to-talk rhythm for ordinary conversation. Voice activity detection, endpointing, and user-controlled interruption are core interaction behavior.

## Listening performance

Listening is an active state, not an invisible recording mode. The avatar should show attention through gaze, posture, mouth stillness, listening light, and a subtle input visualizer.

The bot may use short backchannels—such as an acknowledgment, breath, or small reaction—when they help the user feel heard. Backchannels must not cut off the user or compete with their speech.

## Speaking performance

Speech should vary naturally through:

- Pace and rhythm
- Pauses and hesitation
- Emphasis
- Pitch and intonation
- Breath and energy
- Sentence length
- Emotional color

The speaking avatar uses the actual output audio to drive mouth movement, facial timing, and accent lighting. Text and speech should remain synchronized when the user is also viewing the transcript.

## Unique bot voices

Each bot receives a voice bible:

- Voice identity and acoustic qualities
- Accent and pronunciation
- Pace and cadence
- Vocabulary and sentence shape
- Emotional range
- Laugh, sigh, breath, and pause style
- Response length and interruption behavior
- Characteristic greetings and sign-offs

Initial direction:

- **Nova:** warm, confident, intimate, playful, expressive, and responsive to flirtatious tone
- **Rivit:** quick, rough-edged, energetic, sarcastic, and impatient when appropriate
- **Sterling:** British, male, composed, measured, articulate, and discreet
- **Luma:** expressive, curious, fluid, emotionally colorful, and creatively enthusiastic

The voice profile is part of the bot contract. The local Kokoro voice IDs are
`af_nova`, `bm_daniel`, `am_onyx`, and `af_aoede` for Nova, Sterling, Rivit,
and Luma respectively. Hindi text routes to Kokoro's `hf_alpha`, `hm_omega`,
`hm_psi`, and `hf_beta` respectively. Missing local speech assets surface an
error; Apple system-voice fallback is disabled. Greetings and replies resolve through
the same profile rather than a global default.

The profile also supplies a persona behavior prompt. TTS changes how a bot
sounds; the behavior prompt changes sentence shape, warmth, humor, vocabulary,
initiative, and boundary behavior. Both layers are required for a believable
bot identity. Spoken output removes markdown and stage directions, applies
small persona-specific speed and emotion adjustments, and synchronizes the
avatar expression with the detected conversational emotion.

Simple greetings and thanks have a direct-response path. Other slow turns may
receive one cached acknowledgement after 3.5 seconds, cancelled when reply
audio arrives or the turn stops. Recognition remains loaded between turns and
low-confidence/repetitive output asks for clarification. Neither language
detection nor the confidence heuristic guarantees correct code-switching.

## Nonverbal vocalizations

Bots may use non-word vocalizations when they fit the moment and the character. Examples include:

- Laughter, chuckles, giggles, and amused breaths
- Sighs, contented exhalations, and thoughtful breaths
- Small gasps or surprised reactions
- Hums and uncertain murmurs
- Coughs, throat-clears, and vocal resets
- Sleepy sounds, yawns, and wake-up breaths
- Emotional vocal textures such as a shaky breath or excited intake

These should be intentional performance events, not random decorations. They need intensity, timing, cooldowns, and user controls. A cough should be rare and contextually plausible; laughter should reflect the bot's actual reaction; breath should not become repetitive or uncanny.

For Nova, breathy and intimate vocal textures may be part of her authored range when the user's chosen interaction style supports it. They must remain responsive to boundaries and stop immediately when the user asks for a different tone.

## Voice effects and sound design

Voice effects should be subtle and bot-specific. Possible effects include small room coloration, radio or comms texture for a specialist, soft resonance for an intimate moment, or stylized transitions for a creative bot. Effects must never obscure words or reduce intelligibility.

System sound effects—wake, listening, thinking, completion, interruption, recovery—remain separate from speech and have independent volume and mute controls.

## Real-time and asynchronous work

Voice remains available while extended work runs. The bot can say that it is continuing a task, provide brief progress updates, and return naturally when work completes. Long work must not monopolize the microphone, speech queue, or avatar state.

## Quality bar

Voice is V1-ready when users can interrupt naturally, hear clear speech with
recognizable bot identity, distinguish listening from silence, experience
believable pauses and emotion, and complete a conversation without the bot
becoming stuck or talking over them. Automated checks cover profile routing,
spoken-text cleanup, local TTS output, automatic greeting, and playback
coordination; remaining qualification is repeated-turn and barge-in soak
testing on representative hardware.
