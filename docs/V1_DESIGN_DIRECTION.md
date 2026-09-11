# MyAvatar V1 design direction

## Medium decision

V1 uses 2D animated companions. The visual system should make 2D feel expressive, responsive, and alive without depending on a 3D avatar pipeline.

2D is the intended V1 medium, not a placeholder for 3D. Future 3D work may be considered separately after the 2D companion language is proven.

## 2D expression system

Each bot is assembled from layered visual parts that can animate independently:

- Base body and silhouette
- Face and eye states
- Mouth and speech shapes
- Lighting and glow layers
- Accent effects and particles
- Context-specific props or overlays
- State and emotion animations

The shared runtime supplies timing, state transitions, audio analysis, interruption, and performance adaptation. Each bot supplies its own art assets, animation vocabulary, palette, and expression rules.

## Animation priorities

1. Voice-reactive mouth and face movement
2. Listening, thinking, and attention states
3. Idle presence and emotional micro-reactions
4. Context-aware work animations
5. Wake, sleep, powered-down, broken, and recovery sequences
6. Bot-specific effects, lighting, and sound cues

## Performance requirements

The 2D renderer must remain smooth on MacBook Air-class hardware in Fast mode. Animation quality may reduce gracefully—particle count, lighting complexity, update frequency, or effect layers—without making the companion appear frozen or lifeless.

Balanced mode may add richer layers, longer animation cycles, more detailed lighting, and higher-quality voice visualization.

## Visual identity rule

Bots share interaction semantics, not visual sameness. Nova, Rivit, Sterling, and Luma should be immediately distinguishable through silhouette, palette, motion language, lighting behavior, facial expression, and sound.
