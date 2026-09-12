# MyAvatar V1 visual system

This is the shared visual language for the V1 companion, panels, banners, and
runtime states. It complements the structural wireframes and bot-specific
visual specification.

## Medium and depth

V1 is a 2.5D system: layered 2D assets create depth through controlled
parallax, scale, light, shadow, and independent animation. The companion must
remain readable at compact widget size and must degrade to fewer layers in Fast
mode without losing state or identity.

## Shared tokens

- Surfaces: dark, quiet, high-contrast panels with one clear primary action.
- Typography: compact, legible labels; plain-language state and permission copy.
- State: every important state has an icon or motion cue plus text; color never carries meaning alone.
- Focus: visible keyboard focus and predictable return focus after dialogs.
- Status: Ready, Listening, Thinking, Speaking, Working, Paused, Unavailable, and Recovering use stable labels across bots.
- Lighting: ambient depth light is subtle; speech and state lights respond to real runtime events.
- Motion: presence is continuous but low amplitude; interruption is immediate and visually unambiguous.

## Rendering profiles

Fast mode reduces particle count, parallax distance, lighting complexity, and
update frequency. Balanced mode can add richer depth, lighting, and voice
visualization. Both profiles preserve the same layout, state labels, controls,
bot identity, and interruption behavior.

## Surface rules

The widget remains the emotional home. Panels are focused extensions, not
dashboards. Banners are compact, dismissible, expandable, and tied to a real
job, permission request, completion, or failure. Error surfaces explain the
next useful action and never imply false readiness.

## Approval gate

A surface is design-ready when its structural wireframe, high-fidelity default
and failure references, motion specification, accessibility behavior, and
visual QA fixture are linked from the V1 design index.
