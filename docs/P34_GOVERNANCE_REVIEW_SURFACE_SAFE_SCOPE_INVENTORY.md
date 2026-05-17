# P34 Governance Review Surface Safe-Scope Inventory

Phase: `P34-governance-review-surface-safe-scope-inventory`

Status: safe-scope inventory

## Purpose

P34 defines the safe local boundary for a future read-only governance review surface that can summarize lifecycle, approval-packet, and audit-evidence records without approving execution or mutating memory.

This phase follows the P31/P32/P33 governance evidence chain and the older P19 admin-review surface chain. It is docs/status/board only. It does not implement a new CLI, run `governance:report`, read real SQLite memory, read audit logs, scan real memory, approve governed actions, write durable memory or audit records, expand public MCP tools or schemas, start services, call providers, run migration/import-export apply, create backups, restore data, change package scripts, change config, push, tag, release, deploy, or create PRs.

## Current Evidence

P34 starts from these committed artifacts:

| Evidence | Safe use in P34 |
|---|---|
| `docs/P19_OBSERVABILITY_ADMIN_REVIEW_SURFACE_PLAN.md` | review-surface purpose, source roles, and no-UI boundary |
| `docs/P19_OBSERVABILITY_ADMIN_REVIEW_SURFACE_INVENTORY.md` | existing dashboard, `observe:http`, `governance:report`, `gate:ci`, and `gate:mainline` review surfaces |
| `tests/fixtures/admin-review-surface-v1.json`; `tests/admin-review-surface-shape.test.js` | synthetic admin-review shape, safety flags, unavailable source shape, and forbidden raw secret/workspace checks |
| `tests/fixtures/admin-review-schema-snapshot-v1.json`; `tests/admin-review-schema-snapshot-gate.test.js` | key-set snapshots for existing review surfaces and forbidden-key boundary |
| `src/cli/governance-report.js`; `tests/governance-report-cli.test.js` | existing read-only governance report behavior, but not executed by P34 |
| `docs/P31_MEMORY_GOVERNANCE_CLOSEOUT_REVIEW.md` | lifecycle helper evidence and runtime-governance blockers |
| `docs/P32_MEMORY_GOVERNANCE_APPROVAL_PACKET_CLOSEOUT_REVIEW.md` | approval-packet helper evidence and action-approval blockers |
| `docs/P33_MEMORY_GOVERNANCE_AUDIT_EVIDENCE_CLOSEOUT_REVIEW.md` | audit-evidence helper evidence and durable-audit-write blockers |
| `src/core/ValidationAggregatorService.js` | static report-shape evidence for P31/P32/P33 helper capabilities |

P34 may cite these artifacts. It must not execute the helpers, read fixtures through runtime code, call the governance report against the real configured database, scan real memory, or infer approval from report visibility.

## Review Questions

A future governance review surface should answer only read-only questions:

- Which lifecycle surfaces and cases are visible in committed evidence?
- Which governed actions are still `BLOCKED_PENDING_APPROVAL`?
- Which audit event families are represented as evidence-only records?
- Which source types were accepted for planning and which failed closed?
- Does review evidence preserve public MCP three-tool freeze?
- Does review evidence preserve `validate_memory` as internal-only?
- Does the review surface distinguish fixture/report-shape evidence from runtime governance implementation?
- Does the review surface show that audit evidence does not approve execution?
- Does the review surface avoid raw secrets, auth headers, provider keys, raw memory content, and raw workspace identifiers?
- Does the review surface keep v1.0 RC at `NOT_READY_BLOCKED`?

## In-Scope Review Inputs

P34 may inventory only these input classes:

- committed docs
- committed fixtures
- committed tests
- static report-shape evidence
- explicit caller-provided summaries
- local validation summaries
- local Git status/diff evidence

Future fixture/helper work should use the same accepted source type posture as P31/P32/P33:

- `committed_doc`
- `committed_fixture`
- `committed_test`
- `explicit_input`
- `static_report_shape`
- `local_git_status`
- `local_validation_summary`

Unsupported source types must fail closed as `acceptedForPlanning=false`.

## Out Of Scope

P34 must not:

- implement a combined runtime governance review CLI
- execute `governance:report` against the real configured database
- read broad real memory, SQLite, diary, vector index, audit logs, cache, or client config
- read raw memory content for review
- accept, reject, supersede, tombstone, or validate real memory records
- approve or execute governed actions
- implement an audit writer or durable audit log write path
- write durable memory, SQLite, diary, vector index, audit, cache, reports, rollback artifacts, backups, or restore outputs
- add public MCP governance tools or schema fields
- run `validate_memory --apply --confirm` or equivalent apply behavior
- run migration/import-export apply
- create backups or restore live state
- start HTTP/stdio services for validation
- call providers or models
- change `.env`, secrets, provider keys, Codex config, or Claude config
- change package scripts, package manifests, lockfiles, or dependencies
- push, tag, release, deploy, create PRs, or modify remote state

## Future Review Shape Candidate

The smallest future fixture contract should be synthetic and explicit-input only:

| Field family | Expected content |
|---|---|
| `schemaVersion` | `memory-governance-review-surface-v1` |
| `mode` | `memory-governance-review-surface` |
| `sources` | lifecycle helper evidence, approval-packet helper evidence, audit-evidence helper evidence, admin-review fixture evidence, ValidationAggregator report-shape evidence |
| `lifecycleReview` | proposal, reject, supersession, tombstone, internal validation, and mutation-audit posture |
| `approvalReview` | governed action statuses, required approvals, blocked execution, and public MCP impact |
| `auditEvidenceReview` | audit event families, blocked write posture, durable audit writer absent |
| `reviewDecision` | `NOT_READY_BLOCKED` until runtime governance, schema enforcement, final RC matrix execution, and A5 actions are complete |
| `safety` | no mutation, no provider, no service start, no real memory scan, no public MCP expansion, no raw secret/workspace exposure |
| `nextSafeActions` | fixture contract, explicit-input helper, or ValidationAggregator report-shape only |

The fixture must prove that visibility is not authorization:

- `executionApproved=false`
- `runtimeIntegrated=false`
- `durableMemoryTouched=false`
- `durableAuditWritten=false`
- `realMemoryScanned=false`
- `publicMcpExpanded=false`
- `canClaimGovernanceRuntimeReady=false`
- `canClaimV1RcReady=false`

## Required Blockers To Preserve

P34 must preserve:

- public MCP tools remain exactly `record_memory`, `search_memory`, and `memory_overview`
- `validate_memory` remains internal-only
- no public governance tool/schema expansion is approved
- no runtime governance integration is implemented
- no durable mutation is approved or performed
- no audit writer is implemented
- no durable audit log write is approved or performed
- no real memory scan/export/import is approved or performed
- no migration/import-export apply is approved or performed
- no backup creation or restore is approved or performed
- no provider/model call is approved or performed
- no service/watchdog/startup install or config switch is approved or performed
- no package script or dependency change is approved or performed
- no push, tag, release, deploy, PR, or remote write is approved or performed
- schema/version runtime enforcement remains incomplete
- ValidationAggregator full implementation remains incomplete
- final RC validation matrix runner execution remains blocked
- v1.0 RC remains `NOT_READY_BLOCKED`

## Validation Plan

Docs-only P34 inventory validation:

```powershell
git diff --check
scripts\validate-local.ps1 -Area docs
rg -n "P34|governance review surface|NOT_READY_BLOCKED|BLOCKED_PENDING_APPROVAL|public MCP|validate_memory|durable|audit writer|real memory|migration|backup|restore|push|release|deploy" docs\P34_GOVERNANCE_REVIEW_SURFACE_SAFE_SCOPE_INVENTORY.md STATUS.md CODEX_MEMORY_NEXT_PHASE_PLAN.md MAINTENANCE_BACKLOG.md .agent_board
```

No `npm test` is required unless source, fixture, or test files change.

## Result

Result: `P34_GOVERNANCE_REVIEW_SURFACE_INVENTORY_ADDED_RUNTIME_STILL_BLOCKED`

P34 opens the governance review surface only as a safe-scope inventory. It does not implement a review CLI, execute runtime review, approve governed actions, write durable audit evidence, mutate durable memory, expand public MCP tools, or claim v1.0 RC readiness.

## Next Recommended Phase

`P34.1-governance-review-surface-fixture-contract`

The next safe phase may add a synthetic committed fixture and focused test for the governance review surface shape. It must remain fixture-first and must not perform durable mutation, public MCP expansion, real memory scan/export/import, migration-import-export apply, backup/restore, provider/service/config action, package script change, push, tag, release, deploy, or PR creation.
