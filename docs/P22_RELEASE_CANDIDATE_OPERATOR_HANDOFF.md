# P22 Release Candidate Operator Handoff

Phase: `P22.8-release-candidate-operator-handoff`

Status: `PRE_RC_HANDOFF_DRAFT`

## Purpose

This document is a pre-release-candidate operator handoff checklist.

It is not an execution checklist, not an approval packet, and not a release-candidate artifact.

It does not authorize running gates, creating an RC artifact, tagging, releasing, deploying, mutating config, starting services, calling providers, reading real memory, applying migration/import-export behavior, or expanding MCP public tools.

## Current Handoff Snapshot

| Field | Current handoff value |
|---|---|
| Release state | `NOT_CREATED` |
| Latest recorded gate refresh result | `PASS` in `P22_RELEASE_CANDIDATE_GATE_REFRESH_RESULT.md` |
| Recorded RC target commit | `806cc847cb37a3e428099b45871a4f1a13c4fa6f` |
| Recorded approval request commit | `c1bb2984a948220376f3fb4265d64589bc0c94c2` |
| Gate execution model | temporary detached worktree / temporary worktree whose `HEAD` equals `rc_target_commit` |
| Public MCP tools | `record_memory`, `search_memory`, `memory_overview` |
| Internal mutation boundary | `validate_memory` remains internal-only |
| Provider calls | blocked unless explicitly approved |
| Live HTTP MCP startup | blocked unless explicitly approved |
| Codex / Claude config mutation | blocked unless explicitly approved |
| Startup / watchdog operation | blocked unless explicitly approved |
| Migration / import-export apply | blocked unless explicitly approved |
| Tag / release / deploy | blocked unless explicitly approved |

The recorded gate refresh pass does not create a release candidate and does not authorize any release action.

## Preflight State Checklist

Before any future RC artifact request, the operator must verify and record:

- exact target repository
- exact branch
- exact target commit
- worktree cleanliness
- remote drift status
- whether the requested operation is docs-only, gate-only, artifact creation, tag, release, deploy, config mutation, service operation, provider call, migration, or import/export apply
- whether the requested operation touches real memory, durable DB, diary, vector index, audit logs, Codex config, Claude config, startup tasks, watchdog tasks, HKCU Run, or external services
- whether all evidence is fresh for the exact target commit
- whether any command could expose secrets, raw `.env` values, provider keys, raw workspace IDs, or broad real memory content

If any item is unknown, stale, or broader than the approved scope, stop before execution.

## Approved Gates To Carry Forward

The latest recorded local non-provider gate refresh passed these gates for `rc_target_commit` `806cc847cb37a3e428099b45871a4f1a13c4fa6f`:

| Gate | Recorded result |
|---|---|
| `git diff --check` | passed |
| docs validation | passed |
| `npm test` | `472/472` passed |
| `npm run gate:ci -- --json` | passed |
| `gate:ci` tests | `457/457` passed |
| `gate:ci` compare | `43/43` passed |
| `gate:ci` rollback | `43/43` passed |
| `gate:ci` providerCalls | `0` |
| `gate:ci` mutated | `false` |
| compare standard suite | `43/43` matched |
| rollback standard suite | `43/43` rollback-ready |

These are evidence for the recorded target commit only. They do not authorize RC artifact creation, tag, release, deploy, config mutation, live HTTP MCP startup, provider calls, migration, import/export apply, or MCP public tool expansion.

## Remaining Blockers

RC artifact creation remains blocked until a separate explicit approval packet names the operation and target artifact.

Open blockers:

- no RC artifact has been created
- no tag has been created
- no release has been created
- no deploy has been performed
- strict mainline gate remains excluded from the recorded gate refresh unless separately approved
- live HTTP MCP observation remains excluded unless separately approved
- live Claude acceptance remains excluded unless separately approved
- provider smoke / benchmark remain excluded unless separately approved
- Codex / Claude config mutation remains excluded unless separately approved
- startup / watchdog installation remains excluded unless separately approved
- SQLite migration, real memory migration, and import/export apply remain excluded unless separately approved
- public MCP tool expansion remains excluded unless separately approved

## Config / Provider / Migration / Import-Export Boundaries

Do not proceed without explicit approval if the requested operation would:

- edit `C:\Users\617\.codex\config.toml`
- edit Claude configuration
- run `claude mcp`
- start or install HTTP MCP service behavior
- install or modify scheduled tasks
- install or modify watchdog behavior
- edit HKCU Run
- call provider smoke or benchmark commands
- require provider keys or credentials
- read broad real memory content
- write durable memory, SQLite, diary, vector, chunk, or audit data
- run SQLite migration, `ALTER TABLE`, or profile confirm/apply behavior
- apply import/export behavior
- create, overwrite, or publish an RC artifact
- create a tag, release, deploy, PR, or remote write

For any approved provider or live-client action, preserve only redacted metadata. Do not write secrets, raw `.env` values, provider keys, auth tokens, private config values, raw workspace IDs in low-risk summaries, or broad real memory content into docs or logs.

## MCP Public Tool Freeze

The public MCP contract is frozen for this handoff:

- `record_memory`
- `search_memory`
- `memory_overview`

`validate_memory` remains internal-only.

Do not add public MCP tools, expose `validate_memory`, change MCP schema, change public tool arguments, or change public error/meta placement as part of RC handoff or artifact creation unless a dedicated approval packet explicitly authorizes that public contract change.

## Local Production Hard Stops

Stop before any operation that would:

- mutate real Codex configuration
- mutate real Claude configuration
- start live HTTP MCP outside approved runtime validation
- install, update, remove, or run startup/watchdog automation
- edit HKCU Run
- create backups or restores touching durable state
- migrate SQLite, memory records, diary, vector index, or chunk index
- run cleanup apply/confirm behavior
- run import/export apply
- call providers
- expose secrets or broad real memory content
- create an RC artifact, tag, release, deploy, or remote write

Ambiguous phrases such as `continue`, `go ahead`, `do it`, `继续`, or `自动推进` are not approval for these actions.

## Client Integration Caveats

Codex Desktop remains expected to use HTTP MCP as the stable default path, but this handoff does not authorize starting HTTP MCP or editing Codex config.

Claude integration evidence remains governed by the P21/P22 client boundary docs. This handoff does not authorize `claude mcp` commands, live Claude acceptance refresh, provider/model calls, or Claude config edits.

Client privacy and scope evidence should be treated as non-regression evidence. If client scope, visibility, public tool contract, or config guidance changes before RC artifact creation, rerun the relevant client privacy/scope checks under an explicitly approved validation scope.

## Rollback / Support Checklist

For any future approved RC artifact operation, the operator handoff must include:

- exact target commit
- exact artifact name and path
- artifact creation command
- whether remote write, tag, release, or deploy is in scope
- fresh gate summary for the target commit
- skipped gates and why they were skipped
- provider call count
- durable memory touch status
- real config touch status
- startup/watchdog touch status
- migration/import-export touch status
- backup requirement
- rollback tier
- rollback command or manual rollback path
- post-rollback validation
- support owner
- reviewer
- known warning states
- stop conditions
- next safe action if the operation fails

If a gate fails, stop the RC path and preserve a redacted failure summary. Do not repair runtime behavior, broaden scope, rerun unrelated gates, or continue to artifact creation in the same phase unless separately approved.

## Exact Approval Needed For RC Artifact Creation

RC artifact creation requires a new explicit approval sentence naming the exact operation, target commit, artifact, mutation scope, and rollback story.

Required approval sentence shape:

```text
I explicitly approve creating the P22 release-candidate artifact <ARTIFACT_NAME> for target commit <TARGET_COMMIT>, limited to <EXACT_MUTATION_SCOPE>, using the rollback story in <APPROVAL_PACKET_PATH>, with no tag, no release, no deploy, no provider call, no live HTTP MCP startup, no Codex or Claude config mutation, no startup/watchdog operation, no real memory preview, no durable memory write, no migration/import-export apply, and no public MCP expansion unless separately named here.
```

The sentence above is a template only. It is not approval while it appears in this document.

The approval packet must also state:

- target repository
- target branch
- target commit
- artifact name
- artifact path
- exact commands
- expected outputs
- changed files or generated files
- rollback command or manual rollback path
- stop conditions
- whether tag/release/deploy are explicitly excluded or separately approved

Default decision: `BLOCKED_HARD_STOP`.

## Handoff Result

Result: `P22_OPERATOR_HANDOFF_DRAFTED_RC_ARTIFACT_BLOCKED_FOR_EXPLICIT_APPROVAL`

This handoff is sufficient for a human operator to review pre-RC state and prepare a future approval packet.

It is not sufficient to create an RC artifact, rerun gates, tag, release, deploy, mutate config, start services, call providers, migrate data, apply import/export, or expand MCP public tools.
