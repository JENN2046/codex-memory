# CM-1254 Runtime Truth Table No-Token Overview Rebase

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1254 is a docs-only status-surface correction for the current runtime gap truth table.

It does not change runtime code, tests, config, startup/watchdog behavior, public MCP tools, provider settings, real memory stores, durable memory/audit state, migration/import/export/backup/restore behavior, remote state, or readiness posture.

## Result

Updated:

- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`

The CM-1182 no-token `memory_overview` section no longer presents pre-CM-1183 behavior as current source fact.

It now distinguishes:

- historical pre-CM-1183 facts where no-token `memory_overview` reached the overview service
- current post-CM-1183 facts where no-token HTTP JSON-RPC `tools/call` for `memory_overview` returns HTTP `403` with `NO_TOKEN_OVERVIEW_REJECTED` before tool execution
- remaining not-ready scope if a selected no-token overview projection is ever reintroduced

## Validation

Passed:

```powershell
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Interpretation

CM-1254 improves auditability by removing a stale source-fact contradiction from the current truth table.

It is not runtime readiness, no-token governance closure, write reliability, recall reliability, or RC readiness.
