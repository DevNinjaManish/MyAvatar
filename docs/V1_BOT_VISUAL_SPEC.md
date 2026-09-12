# MyAvatar V1 bot visual specification

The generated V1 activity-state reference is
[`design-references/v1-companion-state-reference.png`](design-references/v1-companion-state-reference.png).
Rows map to Nova, Sterling, Rivit, and Luma; columns map to ready, listening,
thinking, speaking, and recoverable error. It is a direction and QA reference,
not a replacement for the current identity portraits or deterministic runtime motion.

## Direction

V1 uses a shared premium robot-family language with distinct character silhouettes, faces, lighting, movement, and sound. Existing bust artwork is the starting point, not the final asset set.

All bots should read clearly at compact widget size before any text label is shown.

## Shared construction

Each bot asset should be prepared as a layered 2.5D package:

- Back glow and ambient shadow
- Rear silhouette and shoulder depth
- Main torso/bust
- Face shell
- Eyes and eye glow
- Mouth/speaker assembly
- Neck and collar depth
- Front lights and accent strips
- Emotion overlays
- Particle/effect layers

The runtime should be able to animate these layers independently without redrawing the whole bust for every state.

## Shared expression set

Every bot needs authored variants for:

- Neutral ready
- Warm welcome
- Attentive listening
- Curious
- Focused thinking
- Speaking
- Amused
- Excited
- Concerned
- Tired or quiet
- Annoyed or skeptical
- Interrupted
- Broken or unavailable
- Recovering
- Powered down

## Nova

Visual thesis: elegant intimate companion with warmth under precision.

- Refine silhouette toward graceful, confident, and slightly softer geometry.
- Make the eyes feel camera-like but emotionally readable.
- Design the mouth as a soft speaker grille or expressive luminous aperture.
- Use rose, copper, pearl, and magenta as primary materials and light.
- Add subtle warm bloom during affection, playful emphasis, and speaking.
- Use smooth, confident motion with small inviting head and shoulder shifts.
- Avoid making her only “pink robot”; identity must come from face, posture, and light rhythm.

## Rivit

Visual thesis: field-built coding machine that is always one fix away from working perfectly.

- Preserve rugged teal/orange materials and visible tools.
- Make the main camera eye and diagnostic display more expressive.
- Give the mouth/speaker a mechanical grille with sharp orange equalizer bars.
- Use sparks, scan lines, warning pulses, and quick mechanical snaps.
- Add asymmetry, small repairs, and modular parts to strengthen his scrappy identity.
- Use compressed, impatient motion with sudden celebratory bursts after success.

## Sterling

Visual thesis: immaculate mechanical butler with quiet competence.

- Preserve navy, ivory, gold, hat, and bow tie.
- Make posture taller, straighter, and more composed than the other bots.
- Give him a refined mouth grille and precise blue/gold voice equalizer.
- Use restrained eye movement, measured light pulses, and polished chimes.
- Add subtle service cues such as a small bow, attentive tilt, or discreet acknowledgement.
- Keep emotional expression visible but controlled.

## Luma

Visual thesis: expressive creative intelligence exploring form and possibility.

- Preserve cyan/violet lighting and the wide expressive face.
- Push the silhouette toward fluid, layered, and less industrial geometry.
- Make the eyes capable of expressive shapes and visual scanning.
- Give the mouth/speaker a fluid light band or painterly waveform.
- Use gradients, color blooms, drifting particles, and soft parallax.
- Make creative work produce visible color, shape, and motion changes.

## Voice visualization mapping

Each bot receives a distinct mapping from the same audio envelope:

- Nova: soft inner-mouth glow with warm pulse and occasional cheek/neck light
- Rivit: segmented orange bars and sharp mechanical mouth movement
- Sterling: measured blue/gold pulse with restrained mouth articulation
- Luma: flowing cyan/violet band with fluid face and eye movement

The mapping should respond to speech energy, pauses, emotional intensity, and nonverbal audio events.

## Mockup set required before production assets

For each V1 bot, create a visual mockup sheet containing:

- Compact idle bust
- Listening
- Thinking
- Speaking with equalizer
- One positive emotion
- One negative or tired emotion
- Working/specialist state
- Broken/recovery state
- Powered-down state
- Fast and Balanced rendering comparison

## Current status

The existing assets are approved as provisional references and MVP-compatible
source material. They are not final V1 production art. Final approval requires
the mockup set above, a layered asset breakdown, expression states, voice
visualization, bot-specific motion direction, and visual QA references.
