# VCP Memory M14 Health Report Raw Private Leak Rejection

Task id: `M14-K2-HEALTH-REPORT-RAW-PRIVATE-LEAK-REJECTION`
Implementation slice: `CM-1773`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_HEALTH_REPORT_M14_SCHEMA_CONTRACT.md`
Evidence type: `fixture-only`, `schema-hardening`, `no-runtime`, `no-write`

## Purpose

This slice hardens the M14 health report schema contract against raw/private
leaks in otherwise allowed string fields.

M14-K1 already rejected forbidden field names and side-effect flags. M14-K2
adds value-shape rejection and safe request id projection so a malicious fixture
cannot place URL/path/token/raw-private shaped content into an allowed field and
have it echoed by the low-disclosure rejection result.

## Added Guardrails

- `reportContext.request_id` must match a short safe id pattern.
- Low-disclosure projection only returns `requestId` when it matches the safe id
  pattern.
- URL-shaped, Windows-path-shaped, Unix private path-shaped, API-key-shaped,
  private-key-block-shaped, raw-private marker-shaped, and synthetic sensitive
  marker-shaped string values are rejected recursively.
- Rejection outputs include only field paths, not submitted values.
- Sensitive value-shape rejection runs before general shape validation, so
  source/evidence field drift cannot leak private strings through invalid-field
  reporting.

## Validation

Targeted validation:

```bash
node --check src/core/VcpMemoryHealthReportSchemaContract.js
node --check tests/vcp-memory-health-report-schema-contract.test.js
node --test tests/vcp-memory-health-report-schema-contract.test.js
```

Expected targeted result: `14/14`.

Full-suite validation:

```bash
npm test
```

Observed full-suite result: `3705/3705`.

## Boundary

```yaml
m14_k2_boundary:
  contract_mode: fixture_health_report_schema_contract_only
  raw_private_value_shape_rejection_added: true
  safe_request_id_projection_added: true
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
  next_safe_route: m14_health_report_readiness_label_accuracy_tests
```

## Conclusion

M14-K2 closes the immediate raw/private value echo gap in the fixture health
report schema contract. It does not unlock dashboard runtime, live VCPToolBox
evidence, private runtime reads, raw-store reads, real queries, providers/APIs,
approvals, or readiness claims.
