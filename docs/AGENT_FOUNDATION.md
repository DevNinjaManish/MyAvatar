# MyAvatar Agent Foundation

MyAvatar uses one lightweight, local-first runtime for Rivet, Nova, Sterling,
Pixel, Luma, and future companions. Personality remains in each bot profile;
orchestration state and capability boundaries remain in the shared core.

## Shared lifecycle

Session events can describe `IDLE`, `LISTENING`, `UNDERSTANDING`, `CONTEXT`,
`PLANNING`, `WORKING`, `VERIFYING`, `NEEDS_APPROVAL`, `SPEAKING`, `COMPLETE`,
`BLOCKED`, `CANCELLED`, and `ERROR`. Events retain the existing session, bot,
sequence, turn, and operation metadata. These are authored observable states,
not hidden reasoning.

`backend/core/agent_state.py` provides the in-memory task record. It stores a
bounded goal, steps, context references, tool summary, verification summary,
blocker, and result. It intentionally does not store a second transcript or
persist task history.

The shared loop vocabulary is Understand → Context → Plan → Act → Observe →
Verify → Recover → Complete. The task object exposes the small state
transitions needed to grow that loop without introducing a workflow engine.
Rivet’s bounded cockpit runner publishes context, working, verification, and
blocked/recovery milestones with compact step observations and verification
summaries. Retry remains a user-invoked bounded rerun, not background autonomy.

## Capabilities and safety

`backend/core/capabilities.py` is an explicit bot-to-capability registry. The
current registered capabilities are Rivet-only repository reading/search,
approved editing, verification, and one bounded repair. Registry entries are
inert descriptors at this stage; registration does not execute a tool or grant
filesystem, shell, Git, or external-service authority.

The same module exposes compact bot profiles that combine a bot label with its
permitted capability metadata. `backend/core/skills.py` provides the separate
skill descriptor layer: skills describe specialist intent for future instruction
bundles, but are inert and never grant permissions. Personality prompts remain
in the bot configuration rather than being mixed into either registry.

Rivet’s existing workspace boundaries, patch validation, explicit approval,
allowlisted verification, one-repair limit, and rollback checks remain the
authority. Other companions cannot use Rivet capability IDs merely because the
capabilities are registered. The Electron cockpit already has a separate
allowlisted command/query table for its local build/test and read-only Git
actions; it is not a general shell API and remains outside the Python
capability registry until an explicit integration is designed.

`backend/core/verification.py` provides a shared summary contract while
preserving specialist-specific check evidence. Rivet continues to use
`backend/core/coding_verify.py`; it has not been replaced by a weaker generic
verifier.

## Voice and workspace

Normal companion turns and Rivet coding turns can publish `agent_state` events.
The existing chat, avatar, equaliser, interruption, and unified workspace
consume those events. Voice remains the primary control path; the workspace is
an observable cockpit, not a separate agent application.

The shared workspace provides lightweight specialist modules for every
companion. Nova and Sterling show planning context; Pixel shows campaign
objective, message, experiment, and copy/output state; Luma shows design brief,
design decision, critique, visual output, and image-tool connection state.
These labels come from the current session only: they do not claim external
actions or create fake memory. Pixel and Luma remain capability-empty until a
future specialist integration is explicitly designed.

The Systems Cockpit is a secondary full-mode view for local health: process CPU,
system memory, selected local model, core speech readiness, lazy coding
readiness, and the current shared task phase. CPU and memory are read through a
trusted local Electron bridge and sampled only while the System view is open;
missing metrics remain unavailable rather than being guessed.

## Not implemented yet

This foundation does not add unrestricted shell access, automatic Git push,
parallel workers, cloud agents, browser automation, MCP, persistent task
continuation, a skills marketplace, background autonomy, or bot-to-bot
delegation. Future batches can connect the existing safe cockpit command table
to shared task observations, add richer Rivet observe/repair loops, specialist
skills, structured delegation, Git lifecycle, and visual workflows behind the
same explicit capability boundary.
