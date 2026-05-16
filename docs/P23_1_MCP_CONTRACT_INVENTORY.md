# P23.1 MCP Contract Inventory

Phase: `P23.1-contract-inventory`

Status: inventory

## 1. Purpose

This document inventories the current public MCP contract for v1.0 readiness.

The purpose is to freeze what v1.0 means at the public MCP boundary before schema versioning, validation hardening, client readiness, migration planning, or release-candidate checklist work continues.

This phase is documentation and state inventory only. It does not modify runtime code, tests, package manifests, client config, provider behavior, durable memory, migration, startup/watchdog behavior, deployment, tags, or releases.

## 2. Current Contract Snapshot

Current public MCP service identity:

- service name: `vcp_codex_memory`
- transport baseline: local streamable HTTP MCP
- validated local path: `http://127.0.0.1:7605/mcp/codex-memory`
- health endpoint: `http://127.0.0.1:7605/health`

Current public MCP tools:

- `record_memory`
- `search_memory`
- `memory_overview`

P22 local deploy validation confirmed:

- `/health ok`
- live `initialize/tools/list ok`
- public MCP tools exactly three
- `observe:http status=ok`
- MCP/HTTP tests `12/12`

This is a local validated MCP contract baseline. It is not production deployment and does not imply startup/watchdog installation, Codex/Claude config switching, provider execution, migration apply, import/export apply, durable mutation expansion, tag, release, or deploy.

## 3. Public Tool Inventory

| Tool | Purpose | Durable write behavior | v1.0 stance |
|---|---|---|---|
| `record_memory` | Create governed memory records with source, scope, evidence, and safety validation. | Approved write path for memory recording. | Keep public and stable. |
| `search_memory` | Retrieve scoped and searchable memory results. | Read-only. | Keep public and stable. |
| `memory_overview` | Report local memory overview, audit paths, health, and summary information. | Read-only. | Keep public and stable. |

No additional public MCP tools are part of the v1.0 baseline unless separately approved through a dedicated MCP contract gate.

## 4. Tool-by-Tool Contract Notes

### `record_memory`

Purpose:

- Record durable memory through the governed public write path.
- Preserve source, scope, evidence, and auditability.
- Enforce validation and safety boundaries before durable writes.

Documentation-level input shape:

- target/category selection for process or knowledge memory
- title
- content
- evidence
- validation/reusability flags
- sensitivity classification
- optional tags
- optional scope metadata such as project, workspace, client, task, conversation, visibility, and retention fields

Documentation-level output shape:

- accepted/rejected decision
- structured content describing the write result
- safe summary metadata
- audit/path references where appropriate
- no raw secret exposure

v1.0 compatibility expectation:

- do not rename the tool
- do not silently loosen validation
- do not silently expand mutation semantics
- do not expose raw scope identifiers in low-risk summaries
- keep SecretScanner and ToolArgumentValidator boundaries intact

### `search_memory`

Purpose:

- Search durable memory across allowed target surfaces.
- Respect scope, visibility, lifecycle, and privacy policy expectations.

Documentation-level input shape:

- query
- target selection
- result limit
- content inclusion option
- optional scope filter
- optional strictness semantics where supported

Documentation-level output shape:

- structured result list
- safe snippets or content according to request flags
- target/source metadata
- ranking or relevance hints where available
- no raw secret exposure
- no cross-client private leakage

v1.0 compatibility expectation:

- do not rename the tool
- do not silently change query semantics
- do not silently broaden private/cross-client visibility
- do not change lifecycle/read-policy behavior without explicit gate

### `memory_overview`

Purpose:

- Provide local overview of memory state, audit paths, health, and summary counts.
- Support operator inspection without acting as a mutation tool.

Documentation-level input shape:

- optional audit window
- optional limit or summary depth settings

Documentation-level output shape:

- structured overview summary
- paths for relevant local audit/log surfaces
- shadow/index/governance/read-policy summaries where available
- no raw secret exposure
- no mutation side effect

v1.0 compatibility expectation:

- do not rename the tool
- do not turn overview into a write/mutation endpoint
- do not expose raw sensitive identifiers in summaries
- keep output safe for local operator review

## 5. Contract Freeze Expectations

Before v1.0:

- Do not rename existing public tools.
- Do not silently change argument semantics.
- Do not silently change output semantics.
- Do not expand durable mutation behavior without explicit gate.
- Do not add update/supersede/forget/import/export tools into the v1.0 baseline unless separately approved.
- Do not conflate local validated MCP contract with production deployment.
- Do not expose `validate_memory` as a public MCP tool without a dedicated approved public MCP proposal.

Contract freeze means the public boundary is stable enough for local Codex/Claude workflows and release-candidate validation, not that future tools are forbidden forever.

## 6. Backward Compatibility Policy

v1.0 compatibility expectations:

- Existing public tool names remain stable.
- Existing accepted input fields remain accepted unless explicitly deprecated with a migration story.
- New fields should be additive, optional, documented, and test-backed.
- Response envelopes remain predictable for Codex/Claude clients.
- Error shape and validation failures remain stable enough for client troubleshooting.
- Existing durable records remain readable.
- Public tool contract changes require explicit review before release.

Breaking changes require:

- contract inventory update
- schema version note
- migration/rollback story
- targeted MCP contract validation
- manual review

## 7. Drift Risks

Known contract drift risks:

- accidental public tool expansion
- exposing internal-only `validate_memory`
- changing record/search/overview response envelopes while adding release evidence
- loosening unknown-field rejection
- broadening durable write semantics through `record_memory`
- changing search scope or lifecycle semantics without policy review
- leaking raw `workspace_id` or sensitive metadata in summaries
- confusing local HTTP MCP validation with production deployment
- adding import/export or migration behavior into MCP before dry-run and approval gates

These risks must be checked before any v1.0 release-candidate gate.

## 8. Non-v1.0 / Post-v1.0 Tool Candidates

The following are not part of the v1.0 public MCP baseline unless separately approved:

- public `validate_memory`
- `update_memory`
- `supersede_memory`
- `forget_memory`
- `checkpoint_memory`
- `handoff_memory`
- `audit_memory`
- `import_memory`
- `export_memory`

Candidate review requirements:

- separate proposal
- schema shape
- audit shape
- lifecycle/scope policy
- privacy review
- dry-run-first behavior
- rollback story
- explicit approval before public MCP expansion

## 9. A5-Gated Contract Changes

The following remain A5-gated:

- production deploy
- startup/watchdog installation
- Codex/Claude config switching
- provider execution
- durable mutation expansion
- SQLite migration apply
- import/export apply
- tag/release/deploy
- any public contract-breaking change
- any public MCP tool expansion
- exposing internal `validate_memory` as public MCP

No ambiguous continuation phrase is sufficient authorization for these changes.

## 10. Validation Expectations

Docs-only validation for this inventory:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Future contract validation before v1.0 release candidate:

```powershell
node --test tests\mcp-contract.test.js tests\mcp-http.test.js
npm test
npm run gate:ci -- --json
npm run gate:mainline:strict
```

Future validation must confirm:

- public tool list remains exactly `record_memory`, `search_memory`, `memory_overview`
- schema validation still rejects unsafe unknown fields
- record/search/overview remain compatible with Codex/Claude local workflows
- no raw secret or raw workspace identifier exposure
- local HTTP validation is not represented as production deploy

## 11. Next Phase Recommendation

Next recommended phase:

`P23.2-schema-versioning-plan`

P23.2 schema/versioning planning is tracked in [P23_2_SCHEMA_VERSIONING_PLAN.md](/A:/codex-memory/docs/P23_2_SCHEMA_VERSIONING_PLAN.md).

P23.2 maps which schemas must be versioned before v1.0 and which schema or migration changes remain blocked without explicit A5 authorization.

P23.3 validation matrix hardening is tracked in [P23_3_VALIDATION_MATRIX_HARDENING.md](/A:/codex-memory/docs/P23_3_VALIDATION_MATRIX_HARDENING.md). It converts this contract inventory and the schema/versioning plan into release-blocking validation expectations.
