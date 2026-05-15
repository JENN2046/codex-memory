# P22.4 Release Candidate Approval Packet Template

Phase: `P22.4-release-candidate-approval-packet-template`

Status: approval-packet template

## Purpose

Provide a reusable A5 approval packet template for a future release-candidate request.

This document is a template only. It is not approval, does not create a release candidate, and does not authorize command execution.

This phase is docs/status/board only. It does not run the release-candidate gate matrix, run `npm test`, run `gate:ci`, start HTTP MCP, install startup or watchdog tasks, edit Codex or Claude configuration, run `claude mcp`, call providers, read real memory content, create backups, restore backups, run migration, apply import/export, change MCP schema or public tools, create a release candidate, tag, release, or deploy.

## Approval Packet Status

Default status: `NOT_APPROVED_TEMPLATE_ONLY`

The template must remain blocked until a future user explicitly fills the packet and approves the named operation.

Ambiguous wording such as `continue`, `go ahead`, `do it`, `继续`, or `自动推进` is not approval.

## Packet Header

```text
Phase:
Requested operation:
Requested by:
Date:
Target repository:
Target branch:
Target commit:
Candidate artifact:
Approval status: NOT_APPROVED
Approval sentence:
```

Required approval sentence shape:

```text
I explicitly approve <operation> for <target commit/artifact> with the mutation scope and rollback story in this packet.
```

Do not treat the sentence above as approval while it appears in this template.

## Scope Declaration

```text
In scope:
- <exact files, commands, gates, artifacts, or config paths>

Out of scope:
- public MCP tool expansion
- validate_memory public exposure
- SQLite migration / ALTER TABLE
- import/export apply
- real memory write
- provider calls unless separately approved
- Codex / Claude config mutation unless separately approved
- startup/watchdog install unless separately approved
- tag/release/deploy unless separately approved
```

## Preflight Requirements

| Requirement | Evidence field | Required before approval |
|---|---|---|
| Clean worktree | `git status --short --branch` | yes |
| Target commit pinned | `git rev-parse HEAD` | yes |
| Remote drift checked | `git ls-remote origin refs/heads/main` | yes |
| Full suite fresh | `npm test` result | yes before RC implementation |
| `gate:ci` fresh | `npm run gate:ci -- --json` result | yes before RC implementation |
| Compare standard fresh | compare standard suite result | yes before RC implementation |
| Rollback standard fresh | rollback standard suite result | yes before RC implementation |
| Strict mainline reviewed | strict gate scope and result | yes if included |
| Docs validation fresh | diff/docs validation result | yes |
| Client privacy reviewed | P21/P22 client privacy evidence | yes |
| Local production safety reviewed | P20 safety checklist | yes |
| Rollback tier assigned | P22.3 rollback tier | yes |
| Support handoff ready | operator handoff fields | yes |

## Mutation Scope

```text
Will mutate remote repository: yes/no
Will create branch: yes/no
Will create tag: yes/no
Will create release: yes/no
Will deploy: yes/no
Will edit Codex config: yes/no
Will edit Claude config: yes/no
Will start HTTP MCP: yes/no
Will install startup task: yes/no
Will install watchdog: yes/no
Will edit HKCU Run: yes/no
Will call provider: yes/no
Will read real memory content: yes/no
Will write durable memory / DB / diary: yes/no
Will run SQLite migration / ALTER TABLE: yes/no
Will apply import/export: yes/no
Will change MCP schema/tools: yes/no
Will change package dependencies: yes/no
```

Any `yes` above requires exact commands, paths, rollback steps, stop conditions, and explicit approval.

## Command Plan

Use concrete commands only after the packet is filled and approved.

```text
Command 1:
Purpose:
Expected output:
Mutation:
Rollback:
Stop condition:

Command 2:
Purpose:
Expected output:
Mutation:
Rollback:
Stop condition:
```

Do not include secrets, tokens, raw `.env` values, raw workspace IDs, broad real memory content, provider keys, auth cookies, or private config values in command output.

## Rollback Story

```text
Rollback tier:
Protected assets:
Backup required: yes/no
Backup location:
Backup verification:
Rollback command:
Manual rollback path:
Post-rollback validation:
Abort criteria:
```

If backup is required, the backup must be created and verified in a separate approved phase before any irreversible mutation.

## Support Handoff

```text
Operator:
Reviewer:
Fresh gates:
Stale gates:
Skipped gates:
Approval-required gates:
Known gaps:
Expected warning states:
Troubleshooting entrypoint:
Escalation path:
Next safe action:
```

## Redaction Rules

The packet and its evidence must not include:

- raw secrets
- API keys
- provider keys
- `.env` contents
- auth tokens
- raw workspace IDs in low-risk summaries
- broad real memory content
- private Codex / Claude config values
- database URLs with credentials

Use placeholders such as `<REDACTED_API_KEY>`, `<REDACTED_TOKEN>`, `<REDACTED_SECRET>`, and `<TARGET_COMMIT>`.

## Approval Decision

Allowed decisions:

| Decision | Meaning |
|---|---|
| `APPROVED_FOR_NAMED_OPERATION_ONLY` | The exact operation in the packet may proceed. |
| `APPROVED_FOR_DRY_RUN_ONLY` | Only non-mutating dry-run commands may proceed. |
| `REJECTED_NEEDS_MORE_EVIDENCE` | More gate/support evidence is required. |
| `REJECTED_SCOPE_TOO_BROAD` | The packet must be narrowed. |
| `BLOCKED_HARD_STOP` | A hard boundary remains unresolved. |

Default decision for this template: `BLOCKED_HARD_STOP`.

## P22.4 Result

Result: `P22_APPROVAL_PACKET_TEMPLATE_READY_NOT_APPROVED`

P22.4 is sufficient to proceed to P22 closeout review.

It is not sufficient to authorize RC implementation, gate execution, startup/watchdog installation, config mutation, provider calls, migration, import/export apply, public MCP expansion, tag, release, or deploy.

## Next Recommended Phase

P22 closeout review is captured in [P22_RELEASE_CANDIDATE_PLANNING_CLOSEOUT_REVIEW.md](./P22_RELEASE_CANDIDATE_PLANNING_CLOSEOUT_REVIEW.md).

P22 gate refresh approval request draft is captured in [P22_RELEASE_CANDIDATE_GATE_REFRESH_APPROVAL_REQUEST.md](./P22_RELEASE_CANDIDATE_GATE_REFRESH_APPROVAL_REQUEST.md).

`P22-release-candidate-gate-refresh-approval-request` remains blocked until explicitly approved.
