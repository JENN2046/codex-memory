# CM-1142 Expanded Dirty Scope Local Commit Isolation Approval Packet

Status: `CM1142_EXPANDED_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1142 drafts a fresh exact approval packet for a possible future one-local-commit isolation action after CM-1141 proved the old CM-1135 approval line is stale for the current dirty worktree.

This packet is not approval. It does not stage, commit, clean, reset, restore, push, approve CM-1111/CM-1115/CM-1120, or execute any runtime proof.

## Bound Target

```text
repository=A:\codex-memory
branch=main
head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
origin_main=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
request_id=CM-1142-EXPANDED-DIRTY-SCOPE-LOCAL-COMMIT-ISOLATION-DRAFT
request_hash=060da750a39415fd627d224d0eda1884a76679c0865d08b57a5d4ed246b91a06
dirty_scope_max_doc_number=1142
dirty_scope_max_status_lines=94
```

Hash input:

```text
CM-1142-EXPANDED-DIRTY-SCOPE-LOCAL-COMMIT-ISOLATION-DRAFT|repo=A:\codex-memory|branch=main|head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d|scope=known_cm_evidence_dirty_scope_through_CM1142_status_docs_source_tests_board_surfaces|action=one_local_commit_only_if_user_exact_approves_after_fresh_status_and_validation|push=false|clean_reset_restore=false|readiness_reliability_claims=false
```

## Draft Approval Line

The following line is a draft only. It is not active unless the user repeats it as a new explicit instruction:

```text
I approve CM1142_EXACT_LOCAL_COMMIT_ISOLATION_ONCE for codex-memory at HEAD 16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d with request_hash 060da750a39415fd627d224d0eda1884a76679c0865d08b57a5d4ed246b91a06, limited to one local commit containing only the known CM evidence dirty scope through CM-1142 status/docs/source/test/board surfaces after fresh git status, diff, ledger consistency, docs validation, focused overclaim/secret scans, guarded diff review pass, and CM-1142 preflight acceptance; no push, no tag/release/deploy, no clean/reset/restore/delete, no dependency/package change, no config/watchdog/startup change, no public MCP expansion, no provider/model/API call, no memory tool call, no true audit/raw store/diary/jsonl read, no durable memory/audit write beyond the local Git commit object, no tombstone/cleanup/rollback/migration/import/export/backup/restore apply, no CM-1111/CM-1115/CM-1120 approval or execution, and no readiness or reliability claim.
```

## Preflight Behavior

CM-1142 extends `SelectedAuditCorrelationLocalCommitIsolationPreflight` so:

- the old CM-1135 approval line remains stale-blocked for the current expanded dirty scope
- this CM-1142 approval line can be recognized as the latest draft packet
- acceptance still returns only `ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED`
- `commitAuthorized=false`, `pushAuthorized=false`, `cleanAuthorized=false`
- future post-CM-1142 dirty-scope expansion fails closed

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
node .\src\cli\selected-audit-correlation-local-commit-isolation-preflight.js --approval-line "<exact CM-1142 line>"
node .\src\cli\selected-audit-correlation-local-commit-isolation-dry-run-plan.js --approval-line "<exact CM-1142 line>"
```

The future commit must remain local only. Any push remains a separate Red Lane action.

## Validation

```text
node --check .\src\core\SelectedAuditCorrelationLocalCommitIsolationPreflight.js
node --check .\tests\selected-audit-correlation-local-commit-isolation-preflight.test.js
node --check .\tests\selected-audit-correlation-local-commit-isolation-preflight-cli.test.js
node --check .\tests\selected-audit-correlation-local-commit-isolation-dry-run-plan-cli.test.js
node --test .\tests\selected-audit-correlation-local-commit-isolation-preflight.test.js .\tests\selected-audit-correlation-local-commit-isolation-preflight-cli.test.js .\tests\selected-audit-correlation-local-commit-isolation-dry-run-plan.test.js .\tests\selected-audit-correlation-local-commit-isolation-dry-run-plan-cli.test.js
```

Targeted CM-1136/CM-1137/CM-1142 tests passed `22/22`.

## Decision

`CM1142_EXPANDED_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`

Allowed interpretation:

- A fresh draft exact approval line now exists for the expanded current dirty scope.
- The line is bound to current `main`, current `HEAD`, request hash, max CM doc number `1142`, and max dirty status line count `94`.

Forbidden interpretation:

- Do not treat this document as approval.
- Do not stage or commit from this document alone.
- Do not push.
- Do not clean, reset, restore, or delete.
- Do not approve or execute CM-1111, CM-1115, or CM-1120.
- Do not claim `memory recall reliable`.
- Do not claim `memory write reliable`.
- Do not claim runtime, RC, production, release, or cutover readiness.

Current state remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
