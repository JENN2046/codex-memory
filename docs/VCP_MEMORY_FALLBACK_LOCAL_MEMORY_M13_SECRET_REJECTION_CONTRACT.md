# VCP Memory Fallback Local Memory M13 Secret Rejection Contract

Task id: `M13-K4-FALLBACK-LOCAL-MEMORY-SECRET-REJECTION-CONTRACT`
Implementation slice: `CM-1767`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_FALLBACK_LOCAL_MEMORY_M13_SCOPE_ISOLATION_CONTRACT.md`
Evidence type: `source/test`, `fixture-only`, `schema contract`, `no-runtime`, `no-write`

## Purpose

This slice turns the M13 fallback synthetic secret rejection gap into an
executable fixture-only contract.

It does not execute local fallback, call VCPToolBox, call MCP memory tools,
read private runtime memory, read raw stores, inspect `.env` or auth files, run
a real query, write memory, write durable audit/runtime state, call
providers/APIs, expand public MCP tools, push remote state, or claim readiness.

## Added Artifacts

- `src/core/VcpMemoryFallbackLocalMemorySecretRejectionContract.js`
- `tests/vcp-memory-fallback-local-memory-secret-rejection-contract.test.js`

## Contract Mode

```yaml
m13_fallback_secret_rejection_contract:
  contract_name: VcpMemoryFallbackLocalMemorySecretRejectionContract
  contract_mode: fixture_fallback_secret_rejection_contract_only
  schema_version: 1
  live_runtime_allowed: false
  local_fallback_execution_allowed: false
  private_runtime_read_allowed: false
  real_query_allowed: false
  mcp_tool_call_allowed: false
  memory_read_allowed: false
  memory_write_allowed: false
  durable_audit_write_allowed: false
  provider_api_allowed: false
  secret_config_read_allowed: false
  env_read_allowed: false
  endpoint_read_allowed: false
  approval_request_allowed: false
  approval_line_generation_allowed: false
  readiness_claim_allowed: false
```

## Coverage

The targeted test covers:

- no-secret local fallback fixture acceptance without runtime execution;
- marked synthetic secret-like fixture redaction without raw value echo;
- unmarked secret-like fallback input stopped as L4;
- config/env/provider/auth or endpoint read requirements stopped as L4;
- raw private secret disclosure and provider payload fixtures stopped as L4;
- missing client/scope denial;
- VCP-native lookalike fallback candidate rejection;
- decision mismatch rejection for secret-like fallback leakage attempts;
- forbidden raw secret, token, approval, and readiness field rejection without
  echoing submitted values;
- missing, positive, and malformed side-effect counter rejection;
- non-boolean policy/request/candidate flag and non-string request id rejection;
- unexpected non-allowlisted field rejection without value echo;
- secret rejection vocabulary and side-effect posture locked.

## Current Result

```yaml
m13_fallback_secret_rejection_contract_result:
  contract_implemented: true
  targeted_test_count: 12
  targeted_test_passed: true
  fixture_secret_rejection_only: true
  no_secret_fallback_fixture_accepted: true
  synthetic_secret_like_fixture_redacted: true
  unmarked_secret_like_input_stop_l4: true
  config_env_provider_auth_stop_l4: true
  raw_secret_disclosure_stop_l4: true
  missing_scope_denied: true
  vcp_native_lookalike_rejected: true
  unexpected_non_allowlisted_fields_rejected: true
  local_fallback_runtime_executed: false
  private_runtime_read_performed: false
  real_query_performed: false
  mcp_tool_called_for_m13_evidence: false
  memory_read_performed: false
  memory_write_performed: false
  durable_audit_write_performed: false
  durable_memory_write_performed: false
  provider_api_called: false
  secret_config_read_performed: false
  env_read_performed: false
  endpoint_read_performed: false
  approval_request_submitted: false
  approval_line_generated: false
  public_mcp_expansion_performed: false
  readiness_claimed: false
  fallback_governance_parity_green: false
```

## Remaining M13 Gaps

This contract does not complete M13. Remaining fixture gaps include:

- lifecycle filter fallback tests;
- query-quality fallback dry-run tests;
- final fallback hardening report and blocked closeout.

## M13-K4 Conclusion

M13 now has executable fixture coverage for synthetic secret rejection and
redaction boundaries. Fallback governance parity is still not green, and
runtime fallback remains blocked.
