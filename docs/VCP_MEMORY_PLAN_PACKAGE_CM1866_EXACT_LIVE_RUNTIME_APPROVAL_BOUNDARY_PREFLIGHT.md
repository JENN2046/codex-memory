# VCP Memory Plan Package CM1866 Exact Live Runtime Approval Boundary Preflight

Task id: `CM-1866-EXACT-LIVE-RUNTIME-APPROVAL-BOUNDARY-PREFLIGHT`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_PLAN_PACKAGE_CM1865_LOCAL_SAFE_CLOSEOUT_REFRESH.md`
Evidence type: `docs-only`, `approval_boundary_preflight`,
`non-authorizing`, `no-runtime`, `no-request-body`, `no-approval-line`,
`no-release`, `no-readiness`

## Purpose

This document defines the boundary shape for a future exact live runtime
approval request.

It does not create the request packet. It does not create, render, store, or
submit a request body. It does not generate, expose, store, accept, or consume
an approval line. It does not start runtime, call VCPToolBox, call MCP memory
tools, read logs, read raw/private memory, write memory, change configuration,
release, deploy, cut over, push, or claim readiness.

## Current Decision

The boundary preflight is complete enough to support a future non-authorizing
request-packet skeleton. The approval packet and approval request are still not
ready.

```yaml
cm1866_exact_live_runtime_approval_boundary_preflight:
  boundary_preflight_created: true
  cm1865_closeout_reviewed: true
  m6_low_disclosure_status_proof_reviewed: true
  m7_low_disclosure_read_shape_reviewed: true
  future_request_packet_skeleton_may_be_prepared: true
  approval_packet_ready: false
  approval_request_ready: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  request_body_generated: false
  request_body_submitted: false
  runtime_authorized: false
```

## Evidence Basis

| Evidence | Status | Boundary meaning |
|---|---|---|
| CM-1865 plan-package closeout | `REVIEWED` | Confirms full live/runtime completion remains incomplete |
| CM-1807 M6 observe-lite closeout | `REVIEWED_FOR_SCOPE_ONLY` | Narrow status proof exists, but does not authorize new runtime work |
| CM-1810 M7 read-shape closeout | `REVIEWED_FOR_SCOPE_ONLY` | Narrow shape proof exists, but does not authorize new read execution |
| M8 narrow workflow evidence | `ACCEPTED_FOR_PLANNING_ONLY` | Supports future boundary selection without claiming complete V8 |
| M15 blocked closeout | `REVIEWED` | RC gate remains blocked |

## Future Exact Boundary Fields

A future exact live runtime approval request, if later prepared, must bind only
low-disclosure fields and must avoid raw secret or private runtime values:

- target alias, not raw target path,
- target readiness class to probe,
- runtime operation family, such as status-only, read-shape, or narrow
  workflow,
- maximum runtime window,
- maximum probe count,
- maximum call count,
- maximum output character count,
- response handling rule,
- log handling rule,
- config/env/secrets handling rule,
- raw/private memory handling rule,
- memory write handling rule,
- provider/API handling rule,
- process cleanup rule,
- receipt path,
- abort conditions,
- validation commands,
- rollback or no-mutation posture.

CM-1866 does not fill those fields with live values.

## Future Boundary Denials

The future request must not include or authorize:

- real bearer/token/secret/config/env values,
- raw runtime output,
- raw memory, raw store, raw audit rows, or private memory values,
- broad memory scan/export/import/migration,
- durable memory write unless a later exact write boundary is approved,
- provider/API calls,
- public MCP tool/schema expansion,
- config/startup/watchdog changes,
- release, deploy, cutover, tag, push,
- production/release/cutover readiness,
- complete V8 or full bridge completion claim.

## Boundary Ledger

```yaml
cm1866_exact_live_runtime_approval_boundary:
  boundary_preflight_created: true
  cm1865_closeout_reviewed: true
  m6_low_disclosure_status_proof_reviewed: true
  m7_low_disclosure_read_shape_reviewed: true
  future_request_packet_skeleton_may_be_prepared: true
  approval_packet_ready: false
  approval_request_ready: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  request_body_generated: false
  request_body_submitted: false
  runtime_authorized: false
  runtime_executed: false
  vcp_toolbox_runtime_called: false
  mcp_memory_tool_called: false
  response_body_read: false
  runtime_log_read: false
  stdout_read: false
  stderr_read: false
  config_env_content_read: false
  secrets_read: false
  private_runtime_read_performed: false
  raw_store_read_performed: false
  raw_audit_row_read_performed: false
  real_query_performed: false
  provider_api_called_by_agent: false
  memory_read_performed_by_agent: false
  memory_write_performed: false
  durable_audit_write_performed: false
  durable_memory_write_performed: false
  config_changed: false
  startup_changed: false
  watchdog_changed: false
  public_mcp_expansion_performed: false
  push_performed: false
  tag_performed: false
  release_performed: false
  deploy_performed: false
  cutover_performed: false
  readiness_claimed: false
  rc_ready_claimed: false
  release_ready_claimed: false
  production_ready_claimed: false
  cutover_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
  next_safe_route: cm1867_exact_live_runtime_non_authorizing_request_packet_skeleton
```

## Conclusion

CM-1866 defines the approval boundary preflight only. It is useful because it
turns the post-closeout residual live/runtime work into a bounded future
request shape, but it still does not request approval, generate request
material, generate an approval line, execute runtime, read/write memory, or
claim readiness.
