# P31 Memory Governance Safe-Scope Inventory

Phase: `P31-memory-governance-safe-scope-inventory`

Status: safe-scope inventory

## Purpose

Define the safe local evidence boundary for the next memory governance phase after P30 closeout.

P31 starts from existing lifecycle, controlled-write, object-model, audit, and admin-review artifacts. It does not restart memory governance and does not implement new runtime mutation.

This phase is docs/status/board only. It does not mutate durable memory, expand public MCP tools or schemas, scan real memory, run migration/import-export apply, create backups, restore data, start services, call providers, change package scripts, change config, push, tag, release, deploy, or create PRs.

## Existing Governance Evidence

| Area | Existing artifact | Safe use in P31 |
|---|---|---|
| Lifecycle states | `docs/MEMORY_LIFECYCLE_CORE_PLAN.md`; `tests/fixtures/lifecycle-policy-v1.json` | reference status semantics, transition policy, read policy relationship |
| Controlled write candidates | `docs/CONTROLLED_WRITE_TOOLS_PLAN.md`; `tests/fixtures/controlled-write-tools-v1.json` | reference candidate names, dry-run-first policy, audit requirements, forbidden actions |
| Mutation audit shape | `tests/fixtures/mutation-audit-shape-v1.json` | reference required audit fields and event families |
| Controlled write dry-run | `src/cli/controlled-write-dry-run.js`; `tests/fixtures/controlled-write-dry-run-v1.json` | reference fixture-only dry-run output shape; do not execute mutation |
| Proposal review | `tests/fixtures/controlled-write-proposal-review-v1.json` | reference defer/allow decisions before public MCP proposal |
| Internal validate flow | `ValidateMemoryService` tests and `validate-memory` CLI tests | reference existing internal-only approval and audit boundary; do not expand public MCP |
| Object model | P13 object model, mapping, import/export fixtures | reference durable object families and dry-run mapping safety |
| Admin review | dashboard, `observe:http`, `governance:report`, gate snapshots | reference read-only review signals and unavailable-source behavior |

## Governance Surfaces In Scope

P31 may inventory these surfaces:

- proposal lifecycle: creation, review, accept, reject, and tombstone boundaries
- supersession lifecycle: old/new memory links, bidirectional integrity, and audit evidence
- tombstone lifecycle: default soft-delete semantics and hard-delete non-goal
- validation lifecycle: internal `validate_memory` evidence, scope policy, and approval boundary
- audit requirements: actor, reason, evidence, lifecycle policy, scope policy, redaction, and reversibility
- approval posture: which actions remain internal-only, deferred, or A5-gated
- review posture: how dashboard / `governance:report` / gates can summarize governance state without writing

## Out Of Scope

P31 must not:

- add public MCP tools
- add public MCP schema fields
- wire new governance operations into `record_memory`, `search_memory`, or `memory_overview`
- mutate SQLite, diary, vector index, audit log, cache, or durable memory
- run real `validate_memory --apply --confirm`
- run migration/import-export apply
- create backup or restore artifacts
- scan broad real memory
- start HTTP/stdio services for validation
- call providers or models
- change `.env`, provider keys, Codex config, or Claude config
- change package scripts or dependencies
- push, tag, release, deploy, or create PRs

## Safe Input Classes

P31 safe work may consume only:

- committed docs
- committed fixtures
- committed tests
- explicit caller-provided summaries
- read-only local Git status/diff evidence
- existing read-only CLI/gate output summaries when commands are safe and already local

P31 safe work must reject or defer:

- raw real memory previews
- broad memory exports
- live provider output
- service-dependent evidence not already available
- secrets, `.env`, auth headers, cookies, provider keys, and raw workspace identifiers
- unapproved migration/import/export/backup/restore evidence
- public MCP expansion proposals that skip approval review

## Required Blockers To Preserve

P31 must preserve these blockers:

- public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`
- `validate_memory` remains internal-only unless a separate public MCP proposal is explicitly approved
- `update_memory`, `supersede_memory`, `forget_memory`, `audit_memory`, `checkpoint_memory`, and `handoff_memory` are not public tools
- durable mutation remains approval-gated
- hard delete remains forbidden by default
- broad real-memory scan/export/import remains blocked
- schema/version runtime enforcement remains incomplete
- final RC validation matrix remains unexecuted
- v1.0 RC remains `NOT_READY_BLOCKED`

## Validation Plan

Docs-only P31 inventory validation:

```powershell
git diff --check
scripts\validate-local.ps1 -Area docs
rg -n "proposal|supersession|tombstone|validate_memory|public MCP|provider|migration|push|release|deploy" docs\P31_MEMORY_GOVERNANCE_SAFE_SCOPE_INVENTORY.md STATUS.md CODEX_MEMORY_NEXT_PHASE_PLAN.md MAINTENANCE_BACKLOG.md .agent_board
```

No `npm test` is required for this inventory unless source or test files change.

## Result

Result: `P31_MEMORY_GOVERNANCE_SAFE_SCOPE_INVENTORY_ADDED_MUTATION_STILL_BLOCKED`

P31 opens memory governance only as a safe-scope inventory. It does not approve durable mutation, public MCP expansion, real memory scan/export/import, migration/import-export apply, backup/restore, provider/service/config action, push, tag, release, or deploy.

## Next Recommended Phase

`P31.1-memory-governance-fixture-contract-review`

The next safe phase may review existing governance fixtures and identify the smallest missing fixture contract. It should remain fixture-first and read-only unless the user separately approves a bounded implementation slice.
