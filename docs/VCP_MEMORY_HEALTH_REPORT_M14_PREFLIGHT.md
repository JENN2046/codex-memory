# VCP Memory M14 Health Report Preflight

Task id: `M14-K0-HEALTH-REPORT-PREFLIGHT`
Implementation slice: `CM-1771`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_FALLBACK_LOCAL_MEMORY_M13_HARDENING_REPORT.md`
Evidence type: `docs-only`, `preflight`, `no-runtime`, `no-write`

## Purpose

This preflight opens M14 at the safe docs/fixture boundary.

M14's goal is a conservative health report covering policy, target, fallback,
query quality, and receipt status without leaking raw private memory or
claiming readiness.

This slice does not implement dashboard runtime code, call the dashboard CLI,
call VCPToolBox, call MCP memory tools, read private memory, read raw stores,
run real queries, call providers/APIs, write memory, write durable audit/runtime
state, expand public MCP tools, push remote state, or claim readiness.

## Entry Conditions

| M14 entry condition | Current evidence | Status |
|---|---|---|
| receipt schema stable | M11 response normalization audit receipt fixture chain; M12 receipt-chain fixture contract | satisfied for fixture/schema work |
| normalized outputs stable | M4/M11 normalization and receipt docs; M13 fallback contracts | satisfied for docs/fixture work |
| fallback hardening available | CM-1770 M13 hardening report | satisfied for fixture/dry-run boundary |
| live runtime health evidence accepted | absent | not satisfied |
| dashboard raw/private leak audit for new M14 output | not started | not satisfied |

M14 may begin as docs/fixture preflight and future schema tests. It may not
claim live health, production readiness, release readiness, cutover readiness,
RC readiness, complete V8, or full bridge completion.

## Health Report Candidate Sections

```yaml
m14_health_report_candidate:
  policy_status:
    allowed_source: committed governance docs and fixture contracts
    forbidden_source: raw private memory, secrets, provider config
  target_status:
    allowed_source: sanitized target packet / approval packet status only
    forbidden_source: raw runtime path, endpoint, token, config, env
  fallback_status:
    allowed_source: M13 fixture/dry-run hardening report
    forbidden_source: live fallback private-memory read
  query_quality_status:
    allowed_source: fixture/temp-local dry-run summaries
    forbidden_source: provider-backed or private runtime query output
  receipt_status:
    allowed_source: low-disclosure receipt schema and validation summaries
    forbidden_source: raw audit rows, raw sqlite/jsonl/cache/vector rows
  readiness_status:
    allowed_value: NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
    forbidden_value: RC_READY / production_ready / release_ready / cutover_ready
```

## Required M14 Guardrails

- Health report output must be low-disclosure.
- Health report output must contain no raw private memory, secrets, tokens,
  endpoints, raw paths, raw provider payloads, raw audit rows, or raw runtime
  responses.
- Every section must distinguish fixture/dry-run evidence from live-runtime
  evidence.
- Missing live evidence must remain visible as a blocker, not normalized into a
  green status.
- Fallback status must preserve that M13 is green only for fixture/dry-run
  boundary and runtime fallback remains blocked.
- Query quality status must preserve that CM-1769 is fixture/temp-local
  dry-run evidence only.
- Receipt status must preserve low-disclosure receipt schema evidence and must
  not expose raw audit data.
- Readiness labels must remain conservative: `NOT_READY_BLOCKED` and
  `RC_NOT_READY_BLOCKED` unless a later exact-approved gate proves otherwise.

## Future Safe Slices

M14 should continue in small local steps:

1. M14-K1 health report schema contract fixture.
2. M14-K2 raw/private leak rejection tests for the health report schema.
3. M14-K3 readiness label accuracy tests.
4. M14-K4 health report source review / blocked closeout.

All future M14 source/test slices must remain local fixture work unless a
separate exact approval authorizes live runtime evidence.

## Current Boundary

```yaml
m14_preflight_boundary:
  health_report_preflight_created: true
  dashboard_runtime_implemented: false
  dashboard_cli_called: false
  vcp_toolbox_runtime_called: false
  mcp_memory_tool_called: false
  private_runtime_read_performed: false
  raw_store_read_performed: false
  real_query_performed: false
  provider_api_called: false
  memory_write_performed: false
  durable_audit_write_performed: false
  public_mcp_expansion_performed: false
  approval_line_generated: false
  approval_request_submitted: false
  readiness_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
  next_safe_route: m14_health_report_schema_contract_fixture
```

## M14-K0 Conclusion

M14 is open only at the docs/fixture preflight boundary. The next safe task is a
health report schema contract fixture that proves low-disclosure section shape
and conservative readiness labels without calling runtime surfaces.
