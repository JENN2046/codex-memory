# P23.5 Client Integration Readiness Plan

Phase: `P23.5-client-integration-readiness-plan`

Status: planning

## 1. Purpose

This document defines the v1.0 Codex/Claude client integration readiness plan after P23.4 local production hardening was committed locally.

The purpose is to define the client identity, visibility, scope, read policy, write policy, proposal flow, audit, conflict handling, and validation expectations that must be true before any real Codex or Claude configuration switch.

This is a planning phase only.

## 2. Current Integration Baseline

Current baseline:

- P22 local HTTP MCP deploy/validation evidence chain is recorded and closed.
- `/health ok`.
- live `initialize/tools/list ok`.
- public MCP tools exactly:
  - `record_memory`
  - `search_memory`
  - `memory_overview`
- `observe:http status=ok`.
- MCP/HTTP tests `12/12`.
- P23 planning through P23.4 are locally committed.
- Public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`.
- `validate_memory` remains internal-only.

This baseline proves local MCP contract and local hardening planning evidence. It does not perform Codex config switching, Claude config switching, provider/model execution, startup/watchdog installation, production deploy, durable memory migration, or v1.0 release.

## 3. What Client Integration Readiness Means

Client integration readiness means Codex and Claude can be connected to the same local memory kernel with predictable identity, visibility, audit, and rollback behavior.

For v1.0, readiness should cover:

- explicit `client_id` expectations
- Codex private memory boundaries
- Claude private memory boundaries
- shared memory rules
- project-scoped memory rules
- proposal flow for sensitive or cross-client writes
- audit requirements for client-originated writes
- read visibility rules
- write visibility rules
- conflict and drift handling between clients
- validation gates before any real config switch

Readiness is not the same as switching real client configuration.

## 4. What This Phase Explicitly Does Not Do

This phase explicitly preserves the following boundaries:

- This does not modify Codex config.
- This does not modify Claude config.
- This does not modify `.env`.
- This does not modify runtime code.
- This does not run provider.
- This does not run SQLite migration apply.
- This does not run import/export apply.
- This does not mutate durable memory.
- This does not alter public MCP tools.
- This does not install watchdog/startup task.
- This does not perform production deploy.
- This does not tag/release/deploy.
- This does not modify tests.
- This does not modify package manifests or lockfiles.

## 5. Codex Client Boundary

Codex client readiness should preserve local-first operation and explicit operator control.

Codex expectations:

- Codex uses the local HTTP MCP endpoint only after explicit config switch approval.
- Codex-originated writes should identify `client_id=codex` or an equivalent documented client identity.
- Codex private memory must not leak into Claude private reads.
- Codex project-scoped memory should be limited by workspace/project visibility rules.
- Codex shared memory should be clearly marked as shared, sourced, and auditable.
- Codex client config changes must be reversible.

This phase does not modify any Codex configuration file.

## 6. Claude Client Boundary

Claude client readiness should preserve explicit local MCP registration and avoid hidden model/provider execution.

Claude expectations:

- Claude uses the local HTTP MCP endpoint only after explicit config switch approval.
- Claude-originated writes should identify `client_id=claude` or an equivalent documented client identity.
- Claude private memory must not leak into Codex private reads.
- Claude project-scoped memory should be limited by workspace/project visibility rules.
- Claude shared memory should be clearly marked as shared, sourced, and auditable.
- Claude config changes must be reversible.

This phase does not run `claude mcp add`, `claude mcp remove`, or any other Claude config mutation command.

## 7. Client Identity Model

Client identity should be explicit and auditable.

Recommended identity fields:

- `client_id`
- `workspace_id`
- `project_id`
- `task_id`
- `conversation_id`
- `visibility`
- `retention_policy`
- `source_client_version`, where available

Identity expectations:

- known client ids should be documented
- unknown client ids should be treated conservatively
- client identity should be included in audit summaries
- low-risk summaries must not expose raw sensitive workspace identifiers
- missing identity should result in safe fallback or explicit validation failure

No schema implementation change is made in this phase.

## 8. Visibility and Scope Rules

Visibility and scope rules should define who can read and write each memory layer.

Recommended visibility classes:

- private to Codex
- private to Claude
- shared across approved local clients
- project-scoped
- workspace-scoped
- task-scoped
- archived or inactive

Read visibility expectations:

- private memory is readable only by the owning client
- shared memory is readable by approved clients
- project memory requires matching project/workspace context
- archived or inactive memory follows lifecycle/read-policy expectations

Write visibility expectations:

- new writes must declare source and scope
- sensitive writes should default to narrower visibility
- broad shared writes should include evidence and audit rationale
- cross-client writes should use proposal flow when sensitivity or ownership is unclear

## 9. Private / Shared / Project Memory Rules

Codex private memory:

- owned by Codex identity
- not visible to Claude private reads
- may be summarized only through redacted, policy-safe overview surfaces

Claude private memory:

- owned by Claude identity
- not visible to Codex private reads
- may be summarized only through redacted, policy-safe overview surfaces

Shared memory:

- must be intentionally marked shared
- must include source/evidence
- must remain auditable
- must not include secrets or raw credentials
- should avoid cross-client private details

Project-scoped memory:

- must bind to project/workspace context
- should remain searchable within that project boundary
- should not become global unless explicitly marked shared
- should preserve lifecycle and retention expectations

## 10. Proposal Flow for Cross-Client Writes

Cross-client or sensitive writes should use proposal-first behavior when ownership, sensitivity, or visibility is uncertain.

Proposal flow expectations:

- proposed memory remains inactive until validated or approved
- proposal records include source client, evidence, sensitivity, intended visibility, and reason
- cross-client shared promotion requires audit rationale
- rejected proposals remain traceable
- supersession and tombstone paths remain audit-visible
- durable activation remains controlled

`validate_memory` remains internal-only. This phase does not expose proposal, validation, update, supersede, forget, import, or export tools as public MCP tools.

## 11. Read Policy Expectations

Read policy should preserve privacy and lifecycle boundaries.

Read expectations:

- Codex private reads do not include Claude private memory
- Claude private reads do not include Codex private memory
- shared reads include only approved shared memory
- project reads respect workspace/project scope
- lifecycle/read-policy filtering remains documented and test-backed
- summaries do not expose raw secrets or raw sensitive workspace identifiers

Read failures should explain whether the cause is scope, visibility, lifecycle status, validation failure, or unavailable local service.

## 12. Write Policy Expectations

Write policy should ensure every client-originated write is scoped, sourced, auditable, correctable, supersedable, forgettable, traceable, and privacy-safe.

Write expectations:

- writes include client identity
- writes include source/evidence
- writes include visibility and scope
- sensitive writes default narrow
- shared writes include explicit reason
- audit records include client-originated context
- SecretScanner and ToolArgumentValidator boundaries remain intact
- durable mutation expansion remains separately gated

The only current public MCP write path remains `record_memory`.

## 13. Conflict and Drift Handling

Client conflicts may happen when Codex and Claude observe, summarize, or write overlapping memory.

Conflict handling expectations:

- preserve both sources until reviewed
- use supersession rather than silent overwrite
- keep rejected or stale records traceable
- prefer proposal flow for cross-client consolidation
- avoid hidden shared-memory promotion
- expose drift in audit or review surfaces

Drift signals:

- conflicting client identity
- visibility mismatch
- project/workspace mismatch
- lifecycle mismatch
- duplicate or competing durable records
- summary disagreement across clients

Conflict resolution remains controlled and auditable.

## 14. Client Config Switch Readiness Checklist

Before any real client config switch, require:

- explicit A5 approval packet
- target client named: Codex, Claude, or both
- exact config file or command named
- exact MCP endpoint named
- backup of existing config
- rollback story
- health check evidence
- public MCP tool freeze evidence
- client identity and visibility expectations reviewed
- scope/privacy validation evidence
- no `.env` or secret exposure
- no provider/model execution unless separately approved
- no startup/watchdog install unless separately approved

Config switch readiness is not config switch approval.

## 15. Validation Requirements

Docs-only validation for this phase:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
powershell -NoProfile -Command "Get-ChildItem docs\P23*.md | ForEach-Object { if ((Get-Content $_.FullName) -match '\s+$') { Write-Error \"Trailing whitespace in $($_.FullName)\" } }"
```

Future client integration readiness validation should include:

```powershell
node --test tests\mcp-contract.test.js tests\mcp-http.test.js
npm run observe:http -- --json
npm run gate:ci -- --json
npm test
```

Future scope/privacy validation should include existing client-scope and privacy fixture evidence before any config switch.

This phase does not run client commands, mutate configs, call providers, or write memory.

## 16. A5-Gated Actions

The following remain A5-gated:

- Codex config switching
- Claude config switching
- production deploy
- startup/watchdog installation
- provider execution
- durable memory mutation expansion
- SQLite migration apply
- import/export apply
- public MCP contract-breaking changes
- tag/release/deploy
- destructive rollback execution
- public MCP tool expansion
- exposing internal `validate_memory` as public MCP

This P23.5 phase does not approve or execute any of those actions.

## 17. Known Integration Gaps

Known client integration gaps:

- Codex config switch is not performed.
- Claude config switch is not performed.
- client identity expectations are planned but not newly implemented here.
- cross-client proposal flow is planned but not newly implemented here.
- no fresh client acceptance run is performed in this phase.
- no provider/model-mediated client run is performed in this phase.
- no startup/watchdog install is performed.
- no production deploy is performed.
- no durable memory mutation expansion is performed.
- no migration/import-export apply is performed.

These gaps do not block P23.5 planning completion. They block any claim that Codex/Claude client switching or full client integration activation has been performed.

## 18. Proposed P23.6 Next Phase

Next recommended phase:

`P23.6-migration-import-export-readiness-plan`

P23.6 should plan migration/import-export readiness while preserving dry-run-first behavior and keeping SQLite migration apply, import/export apply, durable data rewrite, provider execution, config switching, startup/watchdog installation, public MCP expansion, tag, release, deploy, and destructive rollback execution separately approved.
