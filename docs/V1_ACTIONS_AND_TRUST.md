# MyAvatar V1 actions and trust

## Decision

Bots may understand context, prepare work, and take useful actions, but access is tiered by risk. Local execution does not mean unrestricted execution.

## Action tiers

### Observe

Allowed after the relevant context permission is granted:

- Read current app, project, workspace, Git, calendar, reminders, files, browser, weather, time, and system context
- Inspect the screen while Seeing Eye is enabled
- Understand status and summarize what is happening

### Prepare

Allowed without executing the final external change:

- Draft a reminder or calendar event
- Prepare a Git command or code change
- Draft a file edit
- Prepare an image-generation or editing operation
- Build a plan or background-work request

The user can inspect the prepared result before execution.

### Low-risk execute

May be enabled as trusted behavior for narrowly defined actions:

- Create local drafts
- Organize bot-owned artifacts
- Run safe read-only project checks
- Generate images locally
- Update MyAvatar's own state

### Consequential execute

Requires confirmation unless the user has explicitly established a narrower standing permission:

- Sending messages or publishing content
- Deleting or overwriting files
- Running destructive Git commands
- Creating or changing external calendar commitments
- Changing system settings
- Actions involving money, accounts, or sensitive external systems

## User control

Every capability shows its current permission, recent use, and revocation control. Voice commands such as “stop,” “cancel,” “what are you doing,” and “revoke Git access” are first-class controls.

The primary bot remains responsible for explaining delegated actions. Specialist bots cannot silently broaden their own permissions.

## Trust progression

New installations begin conservatively. As the user gains confidence, they can authorize a bot, a capability family, or a specific action pattern. Permissions remain visible and editable rather than becoming invisible permanent trust.
