# P23 v1.0 Memory Kernel Plan

Phase: `P23-v1.0-memory-kernel-planning`

Status: planning

## 1. Release Objective

v1.0 means `codex-memory` is ready to be treated as a local-first, auditable, reversible, privacy-safe memory kernel for Codex and Claude workflows.

The v1.0 target is a stable local MCP memory kernel with:

- stable public MCP contract
- governed durable memory write path
- searchable and auditable records
- traceable correction / supersession / forget story
- privacy-safe scope and client boundaries
- rollback and validation evidence
- documented local operation and support path

v1.0 explicitly does not mean:

- production deployment has been performed
- startup/watchdog hardening has been installed
- Codex or Claude config has been switched
- provider execution has been approved
- real migration/import-export apply has been run
- every future controlled write tool is public
- `validate_memory` is public MCP
- VCP donor internals are copied line-for-line

The current baseline is a locally validated MCP kernel. P22 proved the local HTTP MCP path is healthy and contract-compatible. That is different from production deployment, which remains separately A5-gated.

## 2. Stable MCP Contract

Current public MCP tools remain:

- `record_memory`
- `search_memory`
- `memory_overview`

v1.0 contract freeze requirements:

- tool names remain stable
- input schemas remain backward-compatible
- response envelope semantics remain stable
- error codes and safety failures remain predictable
- unknown fields remain rejected where schemas say `additionalProperties=false`
- public tool list remains exactly three unless a dedicated approved MCP expansion phase changes it

Backward compatibility policy:

- additive optional fields may be planned only with schema/version notes
- breaking changes require a migration and rollback story
- existing durable records must remain readable
- client behavior for Codex and Claude must remain predictable

Tool additions that remain post-v1.0 or separately gated:

- public `validate_memory`
- `update_memory`
- `supersede_memory`
- `forget_memory`
- `checkpoint_memory`
- `handoff_memory`
- `audit_memory`
- import/export public MCP tools

## 3. Versioned Schema Plan

Current schema baseline includes the public MCP schemas, durable record object-model fixtures, import/export-safe shape fixtures, lifecycle policy fixtures, and mutation audit shape fixtures.

Before v1.0, the project must identify which schemas are versioned:

- public MCP tool input/output schemas
- durable `MemoryRecord` / chunk / audit / lifecycle object shapes
- import/export envelopes
- migration readiness reports
- audit event formats
- local deploy and release-candidate evidence records

Migration requirements:

- dry-run first
- no real SQLite migration without explicit A5 approval
- no `ALTER TABLE` on real DB without backup and rollback story
- compatibility check against existing durable records
- fixture-backed missing-field and fallback behavior

Rollback expectations:

- each schema version change has a documented rollback path
- import/export and migration plans include checksum and manifest verification
- migration apply remains blocked until explicitly approved

Compatibility with existing durable records must be preserved through read fallback, missing-field handling, and audit-visible compatibility notes.

## 4. Memory Safety Baseline

v1.0 safety expectations:

- no raw secrets in durable memory, docs, reports, audit summaries, or release artifacts
- `.env` and provider keys remain outside commits and reports
- SecretScanner covers write content and scope metadata
- ToolArgumentValidator rejects unsafe or unknown public inputs
- durable writes remain scoped and sourced
- lifecycle/read-policy behavior is documented and test-backed
- `validate_memory` remains internal-only unless separately approved

Runtime validation requirements:

- public tool schema contract tests
- HTTP MCP contract tests
- security-write policy tests
- scope and privacy boundary tests
- lifecycle/read-policy fixture tests
- mutation audit shape tests

Durable memory write boundary:

- record writes must remain auditable
- controlled mutation must remain internal or separately gated
- durable memory activation is not implied by local deploy validation

## 5. Local Deployment Baseline

P22 local validation proved:

- `/health ok`
- live `initialize/tools/list ok`
- public MCP tools exactly `record_memory`, `search_memory`, `memory_overview`
- `observe:http status=ok`
- MCP/HTTP tests `12/12`

What remains non-production:

- no production deploy
- no startup/watchdog install
- no Codex/Claude config switching
- no provider execution
- no migration/import-export apply
- no durable memory activation beyond already approved local behavior

Startup/watchdog requirements before v1.0:

- explicit approval packet
- rollback story
- service/process stop story
- log and health observation story
- no silent scheduled task or startup entry modification

Port/session/log/health expectations:

- default loopback HTTP port remains documented
- MCP path remains documented
- health endpoint remains available
- session header handling remains tested
- logs remain local and reviewable

Separate A5 authorization is still required for production deploy, startup/watchdog install, config switching, provider execution, durable mutation expansion, and migration/import-export apply.

## 6. Client Integration Plan

Codex integration expectations:

- stable HTTP MCP endpoint guidance
- stable public tool contract
- clear local config instructions
- no automatic config mutation

Claude integration expectations:

- documented local MCP acceptance path
- no automatic `claude mcp add/remove`
- client identity and visibility expectations documented before config switch

Client identity and visibility rules:

- `client_id` must remain bounded to known values
- private records must not leak cross-client
- workspace/project/shared visibility must remain test-backed
- summaries must avoid raw `workspace_id` exposure

Config switching remains separately gated because it mutates user-owned client configuration and can affect live workflows.

## 7. Migration / Import-Export Plan

v1.0 migration/import-export readiness must remain dry-run first.

Manifest requirements:

- source version
- target version
- record counts
- checksum summary
- audit refs
- redaction status
- scope/lifecycle compatibility status

Checksum/audit requirements:

- deterministic checksum where possible
- audit trail for migration plan generation
- no raw secret or raw workspace identifier exposure in low-risk summaries

No apply without explicit authorization:

- no import apply
- no export of broad real memory
- no migration apply
- no cleanup apply

Rollback requirements:

- backup requirement before apply
- restore story
- post-apply validation matrix
- hard stop if backup or rollback cannot be proven

## 8. Validation Matrix

Required docs validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Required MCP/HTTP validation:

```powershell
node --test tests\mcp-contract.test.js tests\mcp-http.test.js
npm run observe:http -- --json
```

Required schema validation:

- MCP contract tests
- object model fixture tests
- import/export shape fixture tests
- migration readiness CLI tests
- admin/release/local-deploy evidence shape review

Required migration dry-run validation:

```powershell
npm run vcp-memory:migration-readiness -- --json
npm run vcp-memory:mapping:dry-run -- --json
npm run lifecycle:sqlite:dry-run -- --json
```

Required security validation:

```powershell
node --test tests\security-write-policy.test.js
npm test
npm run gate:ci -- --json
```

Required rollback validation:

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
npm run rollback:mainline:plan -- --json
```

Provider validation remains separately gated and must not be included in default v1.0 local validation without explicit approval.

## 9. Release Gates

Blocks v1.0:

- public MCP contract drift
- unresolved security-write policy failure
- failing `npm test`
- failing `gate:ci`
- compare/rollback mismatch
- undocumented schema/version baseline
- missing rollback story
- missing known gaps
- unresolved migration/import-export apply boundary
- unclear Codex/Claude client boundary
- raw secret or raw workspace identifier exposure

Requires A5:

- production deploy
- startup/watchdog install
- Codex/Claude config switch
- provider execution
- durable memory mutation expansion
- SQLite migration / `ALTER TABLE`
- import/export apply
- tag/release/deploy

Can be done in A4.8:

- docs planning
- fixture additions
- schema shape tests
- dry-run CLIs
- local non-provider validation
- status/board updates
- guarded local commits when explicitly allowed

Requires manual review:

- release notes
- known gaps
- rollback story
- security review
- client config instructions
- any A5 approval packet

## 10. Proposed Phase Breakdown

Suggested P23 sequence:

- `P23.1-contract-inventory`
- `P23.2-schema-versioning-plan`
- `P23.3-validation-matrix-hardening`
- `P23.4-local-production-hardening-plan`
- `P23.5-client-integration-readiness-plan`
- `P23.6-migration-import-export-readiness-plan`
- `P23.7-v1.0-release-candidate-checklist`

Each phase should remain evidence-first and scoped. Runtime changes, config switches, migration apply, provider execution, production deploy, tag, release, and durable mutation expansion remain blocked unless explicitly authorized.

P23.1 contract inventory is tracked in [P23_1_MCP_CONTRACT_INVENTORY.md](/A:/codex-memory/docs/P23_1_MCP_CONTRACT_INVENTORY.md).

P23.2 schema/versioning planning is tracked in [P23_2_SCHEMA_VERSIONING_PLAN.md](/A:/codex-memory/docs/P23_2_SCHEMA_VERSIONING_PLAN.md).

P23.3 validation matrix hardening is tracked in [P23_3_VALIDATION_MATRIX_HARDENING.md](/A:/codex-memory/docs/P23_3_VALIDATION_MATRIX_HARDENING.md).
