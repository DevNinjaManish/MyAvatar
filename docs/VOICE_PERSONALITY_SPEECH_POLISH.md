# Voice Personality + Speech Polish

This batch keeps the existing local Kokoro voice identities while improving spoken delivery safety and character.

## Changes

- Voice-specific speed multipliers are intentionally subtle: Sterling is most measured, Rivet slightly measured, Nova/Luma neutral, and Pixel slightly quicker.
- Displayed chat text is unchanged. Speech-only sanitisation removes code blocks, URLs, long paths, emoji and Markdown noise as before.
- Truncated/unclosed Markdown code fences are now treated as code and never read verbatim.
- Diff/source-heavy output is converted to a short natural-language lead plus a pointer that exact technical details are in chat.
- Speed is clamped to a conservative range so profile/emotion multipliers cannot create extreme delivery.

## Safety and scope

This does not change bot voices, Rivet permissions, coding execution, model prompts, or displayed answers. Native listening quality still requires Mac hardware testing; automated tests only certify transformation and configuration behavior.
