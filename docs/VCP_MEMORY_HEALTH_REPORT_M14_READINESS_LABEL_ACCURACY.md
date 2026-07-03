# VCP Memory M14 Health Report Readiness Label Accuracy

Task id: `M14-K3-HEALTH-REPORT-READINESS-LABEL-ACCURACY`
Implementation slice: `CM-1774`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_HEALTH_REPORT_M14_RAW_PRIVATE_LEAK_REJECTION.md`
Evidence type: `fixture-only`, `schema-hardening`, `no-runtime`, `no-write`

## Purpose

This slice hardens the M14 health report schema contract so readiness labels are
field-specific.

M14-K1 allowed the shared label vocabulary to appear in both `project_status`
and `rc_status`, while the decision logic still required exact labels. M14-K3
turns that implicit later decision into explicit shape validation:

- `readiness.project_status` must be `NOT_READY_BLOCKED`.
- `readiness.rc_status` must be `RC_NOT_READY_BLOCKED`.

This makes label swaps fail at the schema boundary instead of appearing as a
generic decision mismatch.

## Added Guardrails

- Project status cannot use RC-only status labels.
- RC status cannot use project-only status labels.
- Readiness overclaims still route to `stop_l4` when labels are otherwise
  accurate.
- The accepted schema still cannot claim production, release, cutover,
  `RC_READY`, complete V8, or full bridge completion.

## Validation

Targeted validation:

```bash
node --check src/core/VcpMemoryHealthReportSchemaContract.js
node --check tests/vcp-memory-health-report-schema-contract.test.js
node --test tests/vcp-memory-health-report-schema-contract.test.js
```

Expected targeted result: `17/17`.

Full-suite validation:

```bash
npm test
```

Observed full-suite result: `3708/3708`.

## Boundary

```yaml
m14_k3_boundary:
  contract_mode: fixture_health_report_schema_contract_only
  field_specific_project_status_label_added: true
  field_specific_rc_status_label_added: true
  readiness_overclaim_l4_preserved: true
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
  approval_request_submitted: false
  approval_line_generated: false
  readiness_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
  next_safe_route: m14_health_report_section_requiredness_tests
```

## Conclusion

M14-K3 closes the readiness label swap ambiguity in the fixture health report
schema contract. It does not unlock dashboard runtime, live VCPToolBox evidence,
private runtime reads, raw-store reads, real queries, providers/APIs, approvals,
or readiness claims.
