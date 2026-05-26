# CM-1135 Dirty Scope Local Commit Isolation Approval Packet

Status: `CM1135_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

Current note after CM-1141: this packet is stale for the current dirty worktree because CM-1136 through CM-1141 expanded the dirty scope after this packet was drafted. CM-1136 preflight now returns `BLOCKED_APPROVAL_PACKET_STALE_DIRTY_SCOPE_EXPANDED` if this exact line is supplied against the current worktree. Do not reuse this line for the current dirty scope; draft a fresh packet after reviewing the expanded scope.

## Purpose

CM-1135 drafts a separate exact approval packet for a possible future local commit/isolation action over the known CM evidence dirty scope.

This packet is not approval. It does not stage, commit, clean, reset, restore, push, approve CM-1111/CM-1115/CM-1120, or execute any runtime proof.

## Bound Target

```text
repository=A:\codex-memory
branch=main
head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
origin_main=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
request_id=CM-1135-DIRTY-SCOPE-LOCAL-COMMIT-ISOLATION-DRAFT
request_hash=381e4d8385b9cd2dcc7e9b13668b42b5f5330bed6812a7b84c01b48b7d765ec2
```

Hash input:

```text
CM-1135-DIRTY-SCOPE-LOCAL-COMMIT-ISOLATION-DRAFT|repo=A:\codex-memory|branch=main|head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d|scope=known_cm_evidence_dirty_scope_after_CM1134_plus_CM1135_status_surfaces|action=one_local_commit_only_if_user_exact_approves_after_fresh_status_and_validation|push=false|clean_reset_restore=false|readiness_reliability_claims=false
```

## Draft Approval Line

The following line is a draft only. It is not active unless the user repeats it as a new explicit instruction:

```text
I approve CM1135_EXACT_LOCAL_COMMIT_ISOLATION_ONCE for codex-memory at HEAD 16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d with request_hash 381e4d8385b9cd2dcc7e9b13668b42b5f5330bed6812a7b84c01b48b7d765ec2, limited to one local commit containing only the known CM evidence dirty scope and CM-1135 status surfaces after fresh git status, diff, ledger consistency, docs validation, focused overclaim/secret scans, and guarded diff review pass; no push, no tag/release/deploy, no clean/reset/restore/delete, no dependency/package change, no config/watchdog/startup change, no public MCP expansion, no provider/model/API call, no memory tool call, no true audit/raw store/diary/jsonl read, no durable memory/audit write beyond the local Git commit object, no tombstone/cleanup/rollback/migration/import/export/backup/restore apply, no CM-1111/CM-1115/CM-1120 approval or execution, and no readiness or reliability claim.
```

## Required Preflight If Later Approved

Before any future local commit can use this packet, the operator must rerun and pass:

```text
git branch --show-current
git status --short
git diff --stat
git diff
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git diff --check
focused overclaim/secret scan over the intended commit scope
```

The future commit must remain local only. Any push remains a separate Red Lane action.

## Stop Conditions

This packet must not be used if:

- `HEAD` differs from the bound head.
- The branch is not `main`.
- Any unknown dirty path appears.
- Any `.env`, secret, package/lockfile, config, watchdog, startup, migration, import/export, backup/restore, or public MCP expansion file appears in scope.
- Any approval would include user-owned work not listed in the known CM evidence scope.
- Validation fails or becomes ambiguous.
- The requested action would stage, commit, or clean more than the known CM evidence dirty scope plus CM-1135 status surfaces.

## Decision

`CM1135_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`

Allowed interpretation:

- A future local commit/isolation action now has a draft exact approval line and preflight boundary.

Forbidden interpretation:

- Do not treat this document as approval.
- Do not stage or commit from this document alone.
- Do not push.
- Do not clean, reset, restore, or delete.
- Do not approve or execute CM-1111, CM-1115, or CM-1120.
- Do not claim `memory recall reliable`.
- Do not claim `memory write reliable`.
- Do not claim runtime, RC, production, release, or cutover readiness.

## Next

This CM-1135 line is stale for the current dirty worktree after CM-1141. If local dirty-scope isolation is still desired, first review the expanded dirty scope and draft a fresh exact approval packet. Otherwise continue with review-only or draft-only local work that does not mutate Git history or runtime state.
