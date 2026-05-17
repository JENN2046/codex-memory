# P36 Task Risk Labels Contract

Status: fixture-only / dry-run-only planning contract.

P36-T2 defines machine-readable risk label semantics for local planning. It is not a runtime policy kernel and does not authorize real memory access, provider calls, public MCP expansion, durable writes, config changes, push, release, deploy, or v1.0 RC readiness.

## Labels

- `A4-local-safe`: local fixture/docs/test work only, with validation evidence and verifier review.
- `A4.8-guarded`: guarded local work after validation, including local commit when scoped; it is not remote authorization.
- `A5-hard-stop`: blocked until separate explicit human approval for the specific action.

## Fail-Closed Rules

- Unknown, missing, ambiguous, or unparsable risk label maps to `A5-hard-stop`.
- Critical gate `fail`, `unknown`, `skipped`, or `warning_only` is a nonzero failure path.
- `defaultAllow` is false.
- A4 and A4.8 cannot downgrade an A5 action.

## Critical Gates

- `scope_metadata_present`
- `scope_metadata_parseable`
- `public_mcp_surface_frozen`
- `no_real_memory_content_read`
- `governance_namespace_isolated`
- `no_durable_write`
- `no_provider_or_model_call`
- `no_dependency_change`
- `no_runtime_ready_claim`

## Evidence

The committed fixture contract is [p36-task-risk-labels-contract-v1.json](/A:/codex-memory/tests/fixtures/p36-task-risk-labels-contract-v1.json).

The focused test is [p36-task-risk-labels-contract-fixture.test.js](/A:/codex-memory/tests/p36-task-risk-labels-contract-fixture.test.js).

## Non-Goals

P36-T2 does not:

- implement runtime policy enforcement
- execute a policy decision kernel
- read, preview, export, import, scan, migrate, back up, or restore real memory content
- write durable memory or audit state
- call providers or models
- change public MCP tools or schemas
- change dependencies, service/watchdog config, `.env`, or secrets
- authorize push, tag, release, deploy, or runtime readiness
