# MyAvatar V1 context and permissions

## Context principle

MyAvatar is local-first, but local does not mean invisible or consequence-free. Context access must be explicit, understandable, revocable, and visible in the product.

## Screen awareness

V1 has one clear global control: the **Seeing Eye** toggle.

When enabled, the selected bot may inspect the user's screen to understand what they are doing. The UI must visibly show when the eye is active. When disabled, screen contents are unavailable to the bot.

The eye is an immediate on/off control, not a permanent consent hidden in settings. The bot should be able to say whether it is currently seeing the screen when asked.

## Other context sources

V1 supports all planned context families: current project, workspace, files and folders, calendar, reminders, Git repositories, weather, time, system state, browser context, and screen context. Access is granted according to bot specialization and user permission.

Each bot declares:

- Which sources it can use
- Why each source is useful
- Whether access is continuous, on-demand, or session-only
- What actions it can take from that context
- How the user can revoke access

Context permission and action permission are separate. A bot being allowed to read a calendar, repository, or screen does not automatically allow it to change anything there.

## Context visibility

The user should be able to answer, at any moment:

- What does the bot currently know?
- What source did that information come from?
- Is the Seeing Eye active?
- Which bot capability used the context?
- What can I turn off right now?

## Memory controls

The user can inspect relationship and factual memory, ask the bot to forget a specific item, delete selected memories, clear a category, or clear all stored memory. Forgetting must remove the item from future retrieval, not merely hide it in the interface.

## Default behavior

V1 should begin with conservative access and let the user expand context access as trust grows. Context-aware behavior must degrade gracefully when a source is unavailable or revoked.

## Intermittent screen understanding

The Seeing Eye does not imply continuous surveillance. While enabled, the bot may take intermittent screen snapshots when context is needed to understand the user's current activity. The bot should explain when screen context materially influenced a response.

The system must distinguish:

- **Current context:** temporary information used to respond now.
- **Activity history:** a limited, visible record of meaningful context events.
- **Relationship memory:** information deliberately retained because it matters later.

These are not interchangeable. Raw screen imagery and a permanent record of every user action are not V1 defaults.

## Recommended activity-history model

V1 retains a summarized, user-visible activity history rather than raw screenshots or a complete action log. The system records meaningful context events—such as a project opened, a sustained work session, a major task transition, or a relevant document—only when they can improve future assistance.

Activity history has a limited retention period and can be paused, edited, searched, or deleted. The user can promote an activity into relationship memory by saying “remember this,” and can ask the bot to forget it later. This gives the companion continuity without making every click, keystroke, or screen frame permanent.
