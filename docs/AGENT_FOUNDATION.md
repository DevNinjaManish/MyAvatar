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

## Capabilities and safety

`backend/core/capabilities.py` is an explicit bot-to-capability registry. The
current registered capabilities are Rivet-only repository reading/search,
approved editing, verification, and one bounded repair. Registry entries are
inert descriptors at this stage; registration does not execute a tool or grant
filesystem, shell, Git, or external-service authority.

Rivet’s existing workspace boundaries, patch validation, explicit approval,
allowlisted verification, one-repair limit, and rollback checks remain the
authority. Other companions cannot use Rivet capability IDs merely because the
capabilities are registered.

`backend/core/verification.py` provides a shared summary contract while
preserving specialist-specific check evidence. Rivet continues to use
`backend/core/coding_verify.py`; it has not been replaced by a weaker generic
verifier.

## Voice and workspace

Normal companion turns and Rivet coding turns can publish `agent_state` events.
The existing chat, avatar, equaliser, interruption, and unified workspace
consume those events. Voice remains the primary control path; the workspace is
an observable cockpit, not a separate agent application.

## Not implemented yet

This foundation does not add unrestricted shell access, automatic Git push,
parallel workers, cloud agents, browser automation, MCP, persistent task
continuation, a skills marketplace, background autonomy, or bot-to-bot
delegation. Future batches can add a safe command registry, richer Rivet
observe/repair loops, specialist skills, structured delegation, Git lifecycle,
and visual workflows behind the same explicit capability boundary.
