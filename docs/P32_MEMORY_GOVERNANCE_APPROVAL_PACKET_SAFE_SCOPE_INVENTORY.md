# P32 Memory Governance Approval Packet Safe-Scope Inventory

Phase: `P32-memory-governance-approval-packet-safe-scope-inventory`

Status: safe-scope inventory

## Purpose

P32 defines the local, docs-first approval packet shape required before any runtime memory governance action can be proposed.

This phase follows the P31 safe-scope chain. It uses committed docs, fixtures, helper evidence, and ValidationAggregator report-shape evidence only. It does not approve or perform governance runtime integration, durable memory mutation, public MCP expansion, real memory scan/export/import, migration/import-export apply, backup/restore, provider calls, service startup, package script changes, config mutation, push, tag, release, deploy, or PR creation.

## Current Evidence

P32 starts from these committed safe-scope artifacts:

| Evidence | Safe use in P32 |
|---|---|
| `docs/P31_MEMORY_GOVERNANCE_SAFE_SCOPE_INVENTORY.md` | governance surfaces, safe input classes, required blockers |
| `docs/P31_1_MEMORY_GOVERNANCE_FIXTURE_CONTRACT_REVIEW.md` | reviewed fixture gap and lifecycle contract boundary |
| `tests/fixtures/memory-governance-lifecycle-contract-v1.json` | synthetic lifecycle, approval, audit, source-type, and public MCP freeze contract |
| `src/core/MemoryGovernanceLifecycleContract.js` | explicit-input helper behavior and fail-closed summary expectations |
| `src/core/ValidationAggregatorService.js` | static report-shape evidence for P31.3 helper capability |
| `docs/P31_MEMORY_GOVERNANCE_CLOSEOUT_REVIEW.md` | P31 closeout and remaining blockers |
| `docs/P27_MIGRATION_IMPORT_EXPORT_APPROVAL_PACKET.md` | reusable approval-packet structure and hard-stop wording |

P32 may cite these artifacts. It must not execute the helper, read fixture files through runtime code, scan real memory, or generate live approval decisions.

## Governed Actions Requiring Approval

Each future governed action remains `BLOCKED_PENDING_APPROVAL` until a separate explicit approval names exact scope, command, target files or records, redaction policy, rollback plan, and validation evidence.

| Future governed action | Default status | Required packet fields |
|---|---|---|
| Accept memory proposal | `BLOCKED_PENDING_APPROVAL` | proposal id/source, scope, before/after lifecycle status, actor, reason, audit event, rollback path |
| Reject memory proposal | `BLOCKED_PENDING_APPROVAL` | proposal id/source, reason, audit event, redaction rules, reviewer identity policy |
| Supersede memory | `BLOCKED_PENDING_APPROVAL` | old/new memory ids, bidirectional link policy, visibility preservation, conflict policy, rollback path |
| Tombstone memory | `BLOCKED_PENDING_APPROVAL` | target id, soft-delete policy, hard-delete prohibition, read visibility rule, restoration path |
| Validate memory internally | `BLOCKED_PENDING_APPROVAL` | internal-only validation scope, evidence source, result policy, audit event, no public MCP expansion |
| Public MCP governance expansion | `BLOCKED_PENDING_APPROVAL` | tool/schema proposal, compatibility review, strict gate, rollback and client impact |
| Durable governance audit write | `BLOCKED_PENDING_APPROVAL` | event type, target ids, actor policy, reason, redaction policy, storage target, verification |
| Governance report write | `BLOCKED_PENDING_APPROVAL` | output path, content policy, secret/workspace redaction, retention, cleanup |
| Real memory governance preview | `BLOCKED_PENDING_APPROVAL` | exact read surfaces, maximum records, redaction, output path, `mutated=false` validation |
| Backup before governance apply | `BLOCKED_PENDING_APPROVAL` | exact files, output directory, manifest, checksum, retention, cleanup |
| Restore after governance apply | `BLOCKED_PENDING_APPROVAL` | target files, service isolation, verified backup, overwrite confirmation, post-restore checks |

## Packet Requirements

A future approval packet must include:

- phase id and human-readable objective
- exact governed action
- action owner and approval owner
- target records, files, or surfaces
- source evidence and source type
- redaction policy for memory content, workspace identifiers, actor identifiers, and audit metadata
- expected lifecycle transition
- expected audit event family
- public MCP impact, which defaults to no expansion
- durable write surfaces, which default to none
- backup and rollback requirement
- validation commands and expected pass criteria
- stop conditions
- cleanup or rollback path for generated artifacts
- statement that approval is action-specific and does not authorize broader governance execution

## Safe Source Types

P32 safe inventory may rely only on:

- `committed_doc`
- `committed_fixture`
- `committed_test`
- `explicit_input`
- `static_report_shape`
- `local_git_status`
- `local_validation_summary`

Any source type outside this list must fail closed as `acceptedForPlanning=false` in future fixture/helper work.

## Required Blockers

P32 must preserve:

- public MCP tools remain exactly `record_memory`, `search_memory`, and `memory_overview`
- `validate_memory` remains internal-only
- no public governance tool/schema expansion is approved
- no durable proposal accept/reject/supersede/tombstone action is approved
- no real memory scan/export/import is approved
- no migration/import-export apply is approved
- no backup creation or restore is approved
- no provider/model call is approved
- no service/watchdog/startup install or config switch is approved
- no package script or dependency change is approved
- no push, tag, release, deploy, PR, or remote write is approved
- schema/version runtime enforcement remains incomplete
- ValidationAggregator remains report-shape oriented and incomplete
- v1.0 RC remains `NOT_READY_BLOCKED`

## Stop Conditions

Stop before:

- reading broad real memory, SQLite, diary, vector index, audit logs, cache, or client config
- accepting, rejecting, superseding, tombstoning, or validating real memory records
- writing durable memory, governance audit events, SQLite, diary, vector index, cache, rollback artifacts, or reports
- adding public MCP governance tools or schema fields
- running `validate_memory --apply --confirm` or equivalent apply behavior
- running migration/import-export apply
- creating backups or restoring live state
- starting HTTP/stdio services for validation
- calling providers or models
- changing `.env`, secrets, provider keys, Codex config, or Claude config
- changing package scripts, package manifests, lockfiles, or dependencies
- pushing, tagging, releasing, deploying, creating PRs, or modifying remote state

## Validation Plan

Docs-only P32 inventory validation:

```powershell
git diff --check
scripts\validate-local.ps1 -Area docs
rg -n "P32|approval packet|BLOCKED_PENDING_APPROVAL|NOT_READY_BLOCKED|public MCP|validate_memory|supersede|tombstone|backup|restore|push|release|deploy" docs\P32_MEMORY_GOVERNANCE_APPROVAL_PACKET_SAFE_SCOPE_INVENTORY.md CODEX_MEMORY_NEXT_PHASE_PLAN.md MAINTENANCE_BACKLOG.md STATUS.md .agent_board
```

No `npm test` is required unless source, fixture, or test files change.

## Result

Result: `P32_MEMORY_GOVERNANCE_APPROVAL_PACKET_INVENTORY_ADDED_ACTIONS_STILL_BLOCKED`

P32 defines approval packet inventory requirements for future governed memory actions. It does not approve or execute any governed action.

## Next Recommended Phase

`P32.1-memory-governance-approval-packet-fixture-contract`

The next safe phase may add a synthetic committed fixture and focused test for the approval-packet shape. It must remain fixture-first and must not perform durable mutation, public MCP expansion, real memory scan/export/import, migration-import-export apply, backup/restore, provider/service/config action, package script change, push, tag, release, deploy, or PR creation.
