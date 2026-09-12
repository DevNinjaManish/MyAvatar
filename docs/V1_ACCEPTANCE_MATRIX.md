# MyAvatar V1 acceptance matrix

This matrix maps each V1 quality area to the evidence required before marking
the corresponding item in `V1_ACCEPTANCE.md` complete.

| Area | Required evidence | Primary test surface | Status |
| --- | --- | --- | --- |
| Nova default and bot identity | Blind reviewer distinguishes all four bots in text, voice, visuals, and decisions | Bot fixtures, voice review, visual QA | Not started |
| Common chat and bot switching | Repeated switch/send/interrupt flow preserves identity and relationship context | JS integration and native smoke | MVP path only |
| Memory and forgetting | Create, retrieve, edit, forget, restart, and verify removed data is not retrieved | Memory contract/integration tests | Not started |
| Activity history | Meaningful events are summarized, visible, bounded, and never raw screen logs | Store tests and inspection UI QA | Not started |
| Voice turn loop | Repeated turns, endpointing, barge-in, cancellation, bot-specific TTS, restart, automatic launch listening, and greeting | Voice integration and soak tests | Partial; automatic launch and bot voice profiles implemented |
| Liveness states | Listening, thinking, speaking, working, sleeping, broken, recovery, and reduced motion are clear | Visual state fixtures | MVP subset |
| Seeing Eye and context | Off-by-default, scoped permission, provenance, freshness, revoke, and graceful failure | Context integration and native QA | Not started |
| Action trust | Read, prepare, approve, deny, cancel, and retry boundaries are explicit | Action contract and UI tests | Not started |
| Specialist panels | Nova/Sterling, Rivit, and Luma panels stay focused and connected to common chat | Panel integration and visual QA | Not started |
| Delegation | Scoped task, visible status, cancellation, timeout, loop rejection, and result return | Delegation contract and soak tests | Foundation only |
| Setup and repair | Clean install, interrupted download, dependency failure, repair, and resume | Native setup matrix | Not started |
| Performance profiles | Fast works on 8 GB target; Balanced remains responsive on preferred hardware | Hardware benchmark and thermal logs | Auto RAM selection and More-menu switching implemented; hardware qualification remains |
| Provider portability | Provider can be replaced through contracts without UI/bot changes | Fake provider and adapter tests | Passing foundation |
| Runtime resilience | Provider health, hard timeout, cancellation, typed health event, reconnect, and streamed response | `runtime-stream` tests and `test:runtime` | Passing |
| Regression safety | Existing launch, chat, stop, voice fallback, and relaunch path remains green | `npm test`, build, runtime and native smoke | Passing foundation |
| Platform controls | Pause/Resume, More, runtime health, hide, quit, and compact geometry remain distinct and unclipped | Native Electron visual QA and interaction smoke | Passing foundation |

## Evidence rules

- A passing unit test alone does not satisfy a user-facing acceptance item.
- Every visual or voice item needs a named fixture and a recorded QA result.
- Every permission or action item needs allow, deny, revoke, failure, and retry coverage.
- Every runtime item needs timeout, interruption, restart, and degraded-mode coverage where applicable.
- Status changes only when the evidence is attached to the relevant change or QA log.
