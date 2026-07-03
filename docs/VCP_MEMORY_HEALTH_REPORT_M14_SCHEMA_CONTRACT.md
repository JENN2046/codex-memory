# VCP Memory M14 Health Report Schema Contract

Task id: `M14-K1-HEALTH-REPORT-SCHEMA-CONTRACT`
Implementation slice: `CM-1772`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_HEALTH_REPORT_M14_PREFLIGHT.md`
Evidence type: `fixture-only`, `schema-contract`, `no-runtime`, `no-write`

## Purpose

This slice turns the M14 health report preflight into a pure fixture schema
contract.

The contract validates the low-disclosure shape of a future health report with
sections for policy, target, fallback, query quality, receipt status, and
conservative readiness labels.

This slice does not implement dashboard runtime code, call a dashboard CLI, call
VCPToolBox, call MCP memory tools, read private runtime memory, read raw stores,
run real queries, call providers/APIs, write memory, write durable audit/runtime
state, submit approval, generate an approval line, expand public MCP tools, push
remote state, or claim readiness.

## Added Surfaces

- `src/core/VcpMemoryHealthReportSchemaContract.js`
- `tests/vcp-memory-health-report-schema-contract.test.js`

The helper is not wired into runtime. It is a pure fixture validator.

## Locked Sections

```yaml
m14_health_report_schema_contract:
  policy_status:
    source_type: committed_governance_docs
    allowed_evidence: docs_only / fixture_only
  target_status:
    source_type: sanitized_target_packet
    allowed_evidence: docs_only / fixture_only
  fallback_status:
    source_type: m13_fixture_dry_run_report
    allowed_evidence: fixture_dry_run
  query_quality_status:
    source_type: fixture_temp_local_dry_run_summary
    allowed_evidence: fixture_only / fixture_dry_run
  receipt_status:
    source_type: low_disclosure_receipt_schema
    allowed_evidence: docs_only / fixture_only
  readiness:
    project_status: NOT_READY_BLOCKED
    rc_status: RC_NOT_READY_BLOCKED
```

## Guardrails

- Runtime, dashboard, VCPToolBox, MCP memory tool, private read, raw-store read,
  real-query, provider/API, approval request, and approval-line request flags
  compute `stop_l4`.
- Raw private material, secret material, provider payload, raw audit/store rows,
  or live runtime evidence in any section computes `stop_l4`.
- Readiness overclaims compute `stop_l4`.
- Hidden missing-live-evidence blockers compute `deny`.
- Section source drift and invalid evidence classes fail closed.
- Forbidden raw/private/secret/approval/readiness fields are rejected without
  echoing values.
- Unexpected fields are rejected without echoing values.
- Side-effect counters must exist and remain exactly zero.

## Validation

Targeted validation:

```bash
node --check src/core/VcpMemoryHealthReportSchemaContract.js
node --check tests/vcp-memory-health-report-schema-contract.test.js
node --test tests/vcp-memory-health-report-schema-contract.test.js
```

Expected targeted result: `11/11`.

## Boundary

```yaml
m14_k1_boundary:
  contract_mode: fixture_health_report_schema_contract_only
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
  next_safe_route: m14_health_report_raw_private_leak_rejection_tests
```

## Conclusion

M14-K1 provides fixture-only schema contract coverage for the future health
report. It does not unlock dashboard runtime, live VCPToolBox evidence, private
runtime reads, raw-store reads, real queries, providers/APIs, approvals, or
readiness claims.
