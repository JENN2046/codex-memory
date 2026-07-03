# VCP Memory M14 Health Report Counter Reason Specificity

Task id: `M14-K5-HEALTH-REPORT-COUNTER-REASON-SPECIFICITY`
Implementation slice: `CM-1776`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_HEALTH_REPORT_M14_SECTION_REQUIREDNESS.md`
Evidence type: `fixture-only`, `schema-test`, `no-runtime`, `no-write`

## Purpose

This slice locks the M14 health report positive side-effect counter rejection
details.

The health report schema must not merely reject nonzero side-effect counters. It
must also keep the rejection low-disclosure and specific enough for future review
without exposing submitted counter payloads or implying that any side effect
actually occurred.

CM-1776 adds regression coverage for:

- `forbidden_positive_side_effect_counters` as the exact reason code,
- `forbiddenCounters` containing counter field names only,
- rejected output not echoing the submitted `counters` object or positive
  counter values,
- rejected projection preserving every runtime, provider, memory, approval, and
  readiness side-effect output as false.

## Validation

Targeted validation:

```bash
node --check tests/vcp-memory-health-report-schema-contract.test.js
node --test tests/vcp-memory-health-report-schema-contract.test.js
```

Expected targeted result: `22/22`.

Full-suite validation:

```bash
npm test
```

Observed full-suite result: `3713/3713`.

## Boundary

```yaml
m14_k5_boundary:
  contract_mode: fixture_health_report_schema_contract_only
  positive_counter_reason_code_locked: true
  forbidden_counter_field_names_only_locked: true
  counter_object_echo_rejected: true
  rejected_projection_side_effect_false_locked: true
  source_runtime_behavior_changed: false
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
  next_safe_route: m14_health_report_source_review_or_blocked_closeout
```

## Conclusion

M14-K5 locks side-effect counter rejection detail for the fixture health report
schema contract. It does not unlock dashboard runtime, live VCPToolBox evidence,
private runtime reads, raw-store reads, real queries, providers/APIs, approvals,
or readiness claims.
