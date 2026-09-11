# Rivet Capability Boundary

Milestone 6 turns Rivet's repository awareness into a real, centrally registered capability layer while keeping the first execution surface strictly read-only.

## Read-only capabilities available now

| Capability | Purpose | Safety boundary |
| --- | --- | --- |
| `repository.list` | List useful repository text files | bounded count; blocked private/generated directories |
| `repository.read` | Read selected UTF-8 repository files | repository-relative paths only; file/count/total-size limits |
| `repository.search` | Search filenames and bounded text | bounded terms, files, hits, and snippets |
| `git.status` | Inspect branch and working-tree changes | fixed `git status` invocation only |
| `git.log` | Inspect recent local history | fixed bounded `git log` invocation only |
| `git.diff` | Inspect staged/unstaged diff summaries | fixed `git diff --stat` invocations only |

These tools are available only to Rivet (`robot`). Other companions fail closed at the registry boundary.

## Mutation boundary

`coding.edit` and `coding.repair` remain side-effecting, approval-gated capabilities. Calling the generic capability executor cannot run them. Actual changes continue through Rivet's existing preview → explicit approval → transaction → verification → rollback flow.

`coding.verify` remains registered but is not exposed through the generic executor because verification has its own allowlisted execution path and lifecycle state.

## Git safety model

Rivet does not receive a general-purpose Git command executor. The code owns the complete argument vector for every Git inspection operation. User/model text cannot provide flags, revisions, paths, shell fragments, environment variables, or subcommands.

Git inspection also has output, history-count, timeout, and status-line bounds. No shell is invoked and stdin is closed.

## Workspace snapshot

The Rivet workspace snapshot now combines:

- bounded repository file tree;
- bounded search results for the current request;
- current Git branch/dirty state;
- recent commits;
- staged and unstaged diff summaries;
- the public capability registry.

If the selected workspace is not a Git repository, the repository inspection remains available and Git reports unavailable rather than breaking the workspace.

## Milestone 6 completion gate

Milestone 6 — controlled local inspection capabilities — is crossed when all of the following are true on `main`:

- one central registry owns Rivet's repository/Git capability IDs and bot permissions;
- Rivet can execute bounded repository list, read, and search through that registry;
- Rivet can inspect Git status, recent history, and diff summaries without arbitrary command execution;
- non-Rivet bots cannot execute these coding capabilities;
- generic capability execution cannot bypass approval-gated mutations;
- repository traversal, blocked directories, file size/count limits, Git timeouts, and output bounds are enforced;
- the Rivet workspace snapshot exposes the new read-only inspection data;
- automated tests cover capability permission, path boundary, fixed Git command vectors, and mutation rejection;
- the final CI run is green.

The next milestone should build the **agent tool loop** on top of this boundary: Rivet chooses among these registered read-only tools, gathers evidence iteratively, then proposes an approved patch rather than relying on one-shot context selection.
