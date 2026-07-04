# CM-1914 Exact-Approved Live Read-Only Proof Request Packet

Status: `COMPLETED_VALIDATED_EXACT_APPROVED_LIVE_READONLY_PROOF_REQUEST_PACKET_NON_AUTHORIZING_NO_RUNTIME_NO_APPROVAL_LINE`

## Scope

CM-1914 prepares the non-authorizing request packet shape for the first future exact-approved VCP native read-only proof.

This packet is a request boundary only:

- It does not grant approval.
- It does not generate an approval line.
- It does not generate or submit a request body.
- It does not execute runtime.
- It does not call VCPToolBox.
- It does not read response bodies, logs, stdout/stderr, config/env, secrets, raw memory, raw stores, or raw audit rows.
- It does not write memory, durable state, receipts, config, startup, watchdog, or public MCP schema.

## Request Boundary

```yaml
request:
  action: one_read_only_vcp_native_proof
  profile: observe-lite
  max_runtime_calls: 1
  max_network_calls: 1
  write_budget: 0
  response_body_byte_budget: 0
  log_read_budget: 0
  result_projection: shape_only
  target: safe_reference_only_unbound_until_jenn_exact_approval
  component: safe_component_reference_only_unbound_until_jenn_exact_approval
  component_action: safe_readonly_action_reference_only_unbound_until_jenn_exact_approval
  request_body_generated: false
  approval_line_generated: false
  runtime_executed: false
```

The target, component, and component action values are intentionally not filled by CM-1914. They must remain safe references only until Jenn gives exact approval in a later step.

## Required Jenn Exact Approval

```yaml
requires_jenn_exact_approval:
  - target reference
  - component/action
  - max call count
  - output projection
  - no-write rule
  - no-body/log rule
  - stop conditions
```

This document does not ask Jenn to approve by itself. It defines what a later exact approval must explicitly cover before CM-1916 can run a live observe-lite proof.

## Output And Receipt Constraints

If Jenn later approves a live proof, the proof must still use the CM-1913 low-disclosure receipt schema:

```yaml
future_receipt_projection:
  allowed:
    - targetReferenceName
    - profile
    - component
    - action
    - statusCategory
    - shapeKeys
    - itemCount
    - durationBucket
    - normalizedResultStatus
    - zeroWriteCounters
  forbidden:
    - raw response body
    - raw memory text
    - memory IDs
    - endpoint URL
    - approval line
    - token
    - config/env
    - stdout/stderr/log
    - provider payload
```

CM-1914 stores no future runtime result and creates no receipt file.

## Stop Conditions

```yaml
stop_conditions:
  - exact target reference missing
  - exact component/action missing
  - max_runtime_calls greater than 1
  - max_network_calls greater than 1
  - write_budget not zero
  - response_body_byte_budget not zero
  - log_read_budget not zero
  - result_projection not shape_only
  - request body generation requested
  - approval line generation requested
  - runtime execution requested before CM-1916 exact approval
  - memory read/write requested outside the approved shape-only proof
  - raw body, raw memory, endpoint, token, config/env, stdout/stderr/log, or provider payload requested
  - readiness, RC, production, release, deploy, cutover, or public MCP expansion claim requested
```

## Explicit Non-Actions

CM-1914 did not execute runtime, call VCPToolBox, call MCP memory tools, read response bodies, read logs/stdout/stderr, read config/env/secrets, read raw private memory/raw stores/raw audit rows, run real queries, write memory, write durable state, write receipts, call providers/APIs, change config/startup/watchdog, expand public MCP, create/submit authorization requests, generate or submit request bodies, generate or submit approval lines, push, tag, release, deploy, cut over, claim readiness, claim `RC_READY`, claim production readiness, or claim full bridge completion.

## Validation

- `git diff --check`
- `bash scripts/validate-local.sh docs`
- `.agent_board/CURRENT_FACTS.json` parse
- `node scripts/validate_current_facts_drift.js`
- `node scripts/validate_autopilot_ledger_consistency.js`
- secret/readiness/output scans
- changed-scope review

Broader validation is recorded as `CMV-2017` in `.agent_board/VALIDATION_LOG.md`.

## Next Route

Next local-safe route: `CM-1915 live read-only proof execution harness`.

CM-1915 may implement a default no-run execution harness with dry-run and exact-approved-live modes. It must default to no-run and must still reject execution without exact approval.
