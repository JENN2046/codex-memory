# P25.1 Schema Version Enforcement Fixture Inventory

Phase: `P25.1-schema-version-enforcement-fixture-inventory`

Status: inventory

## 1. Purpose

This document inventories the existing fixture and test coverage that can support future schema/version runtime enforcement.

This phase does not implement runtime enforcement.
This phase does not change tests.
This phase does not change public MCP tools or schemas.
This phase does not run migrations, import/export apply, provider calls, service startup, push, tag, release, or deploy.

## 2. Current Coverage Map

| Surface | Current evidence | Covered today | Gap for enforcement |
|---|---|---|---|
| Public MCP three-tool freeze | `tests/mcp-contract.test.js`; `tests/v1-rc-validation-aggregator.test.js`; `tests/v1-rc-validation-aggregator-implementation.test.js` | tools remain `record_memory`, `search_memory`, `memory_overview` | future enforcement should keep this as a release-blocking invariant |
| MCP argument schema strictness | `tests/mcp-contract.test.js` | `additionalProperties=false`, invalid enum/scope rejection | response envelope versioning is not separately inventoried |
| Memory object schema family | `tests/fixtures/vcp-memory-object-model-v1.json`; `tests/vcp-memory-object-model-fixture.test.js` | object families and `schema_version` required across modeled objects | missing-version fallback behavior is not modeled here |
| Memory object round-trip | `tests/fixtures/vcp-memory-object-round-trip-v1.json`; `tests/vcp-memory-object-round-trip.test.js` | export-safe JSON round-trip preserves identity/scope/lifecycle refs | enforcement policy for unknown future versions is not covered |
| Import/export envelope | `tests/fixtures/vcp-memory-import-export-shape-v1.json`; `tests/vcp-memory-import-export-shape.test.js` | export/import envelope includes matching `schema_version` | runtime import rejection/compatibility behavior remains unimplemented |
| Migration readiness report | `tests/fixtures/vcp-memory-migration-readiness-v1.json`; `tests/vcp-memory-migration-readiness-cli.test.js` | readiness report shape and blocked migration state | no real migration compatibility scan; apply remains outside scope |
| Lifecycle schema/policy | `tests/fixtures/lifecycle-policy-v1.json`; lifecycle read-policy fixtures/tests | lifecycle status families and read-policy summary boundaries | versioned lifecycle migration path is not implemented |
| Mutation audit shape | `tests/fixtures/mutation-audit-shape-v1.json`; `tests/mutation-audit-shape.test.js` | mutation audit event shape and redaction/policy flags | audit event version upgrade handling is not implemented |
| Controlled write candidates | controlled-write fixtures/tests | dry-run-first and public MCP freeze boundaries | public mutation expansion remains out of baseline |
| Validation aggregator schema status | `tests/fixtures/v1-rc-validation-aggregator-v1.json`; aggregator tests | reports `schemaVersionRuntimeEnforcementImplemented=false` and status `planned_not_implemented` | future P25.3 should add richer status once fixture policy exists |
| Security / exposure boundary | security, object, import/export, aggregator fixtures/tests | no raw secret or raw workspace ID in low-risk summaries | real-memory scans require explicit scoped approval |

## 3. Existing Strengths

Strong current coverage:

- public MCP tools are repeatedly locked to exactly three tools.
- MCP runtime validation rejects unknown fields and invalid enum/scope values.
- VCP object fixtures require `schema_version` in modeled object families.
- import/export fixtures include explicit envelope `schema_version`.
- migration readiness and validation aggregator reports honestly block runtime enforcement.
- redaction and raw workspace boundaries are tested across several fixture families.

## 4. Coverage Gaps

Important gaps before runtime enforcement:

- no fixture defines accepted, missing, and unknown schema-version fallback cases in one enforcement-focused contract.
- no `SchemaVersionPolicy` behavior exists.
- no runtime compatibility scanner exists.
- no dry-run CLI exists for schema compatibility.
- no executable gate distinguishes safe old durable records from invalid new writes.
- no enforcement test proves old diary or SQLite rows remain readable after version policy is introduced.
- validation aggregator only reports enforcement as not implemented; it does not yet summarize fixture-level schema compatibility.

## 5. Recommended P25.2 Fixture Contract

`P25.2-schema-version-policy-fixture-tests` should introduce a fixture-only contract with:

- known schema families.
- accepted current versions.
- missing-version fallback behavior.
- unknown-version handling.
- new-write rejection expectations.
- old-record read tolerance expectations.
- no-migration/no-mutation safety flags.
- no raw secret and no raw workspace summary guarantees.

Suggested fixture path:

```text
tests/fixtures/schema-version-policy-v1.json
```

Suggested test path:

```text
tests/schema-version-policy-fixture.test.js
```

## 6. Validation For This Inventory Phase

Docs-only validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

This inventory is complete only if current file references match repository reality and no runtime/test/package/config/data change occurs.

