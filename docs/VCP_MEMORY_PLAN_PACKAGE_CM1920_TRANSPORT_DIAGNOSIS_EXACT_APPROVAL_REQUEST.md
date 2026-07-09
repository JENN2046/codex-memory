# CM-1920 Transport Diagnosis Exact Approval Request Packet

Status: `COMPLETED_VALIDATED_TRANSPORT_DIAGNOSIS_EXACT_APPROVAL_REQUEST_PACKET_NON_EXECUTING_NO_APPROVAL_LINE`

Date: 2026-07-04

## Scope

CM-1920 prepares a non-executing exact approval request packet for one future transport diagnosis after CM-1916 produced `transport_error` and CM-1919 locked the source-only diagnosis contract.

This packet is not authorization. It does not grant approval, generate an approval line, generate a request body, execute runtime, call VCPToolBox, inspect live process state, resolve or disclose an endpoint, read config/env, read secrets, read logs, read response bodies, read raw memory, write memory, change configuration, or claim readiness.

## Approval Request Boundary

Jenn exact approval is required before any CM-1921 live transport diagnosis.

```yaml
approval_request:
  purpose: transport_target_diagnosis
  target_reference_name: operator-vcp-toolbox-service-ref
  max_network_calls: 1
  max_runtime_calls: 1
  request_body_generation: false
  response_body_byte_budget: 0
  log_read_budget: 0
  config_env_read: false
  secret_read: false
  memory_read: false
  memory_write: false
  durable_write: false
  endpoint_disclosure: false
  output_projection:
    - transport_reachable_true_false
    - status_class_only
    - duration_bucket
  optional_output_projection_if_separately_approved:
    - process_count_bucket
```

The target is a safe reference name only. CM-1920 does not resolve the reference to a locator and does not disclose an endpoint URL.

## Required Jenn Exact Approval Fields

A future approval must explicitly cover:

- `purpose=transport_target_diagnosis`
- target reference name
- max network call count
- max runtime call count
- zero response-body budget
- zero log-read budget
- no request-body generation
- no config/env read
- no secret read
- no memory read
- no memory write
- no durable write
- no endpoint disclosure
- allowed output projection
- stop conditions
- whether process count bucket is included or excluded

## Forbidden In CM-1921 Under This Packet

This request packet does not permit:

- component/action read proof
- read-shape proof
- response body read or persistence
- raw error payload read or persistence
- endpoint URL disclosure
- locator value disclosure
- config/env path or value read
- secret, token, credential, key, or auth material read
- runtime logs, stdout, stderr, or process output read
- raw memory, private memory content, raw store, or raw audit row read
- request body generation or submission
- approval line generation, exposure, storage, or submission
- memory write
- durable write
- provider/API call
- public MCP expansion
- release, deploy, cutover, push, or readiness claim

## Allowed Future Receipt Projection

If Jenn later approves CM-1921, the execution receipt may record only:

```yaml
future_receipt_allowed:
  - targetReferenceName
  - purpose
  - statusCategory
  - transportReachable
  - statusClass
  - durationBucket
  - processCountBucket if separately approved
  - zeroWriteCounters
  - responseBodyRead=false
  - logRead=false
  - configEnvRead=false
  - secretRead=false
  - memoryRead=false
  - memoryWritten=false
```

## Stop Conditions

CM-1921 must stop before any live action if:

- Jenn exact approval is missing, stale, broader than this packet, or ambiguous
- requested target reference differs from this packet
- max network calls exceed `1`
- max runtime calls exceed `1`
- response body byte budget is not `0`
- log read budget is not `0`
- request body generation is requested
- endpoint disclosure is requested
- config/env, secret, log, raw output, raw memory, or memory write is requested
- component/action probing or read-shape proof is requested
- output projection exceeds status class, reachable true/false, duration bucket, or separately approved process count bucket
- readiness, release, deploy, cutover, push, or public MCP expansion is requested

## Explicit Non-Actions

CM-1920 did not:

- perform a new live call
- retry CM-1916
- call VCPToolBox
- call MCP memory tools
- inspect live process state
- resolve or disclose endpoint/locator values
- read response body, raw error payload, logs, stdout, stderr, config/env, secrets, raw memory, raw stores, or raw audit rows
- generate or submit request bodies
- generate, expose, store, or submit approval lines
- write memory or durable runtime/audit state
- change config, startup, watchdog, dependencies, runtime binding, or public MCP schema
- push, tag, release, deploy, or cut over
- claim readiness, `RC_READY`, production readiness, release readiness, cutover readiness, complete V8, or full bridge completion

## Validation Boundary

CM-1920 validation is docs/status/governance only:

```text
git diff --check
bash scripts/validate-local.sh docs
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted secret/readiness/raw-output scan over changed files
changed-scope re-review
```

## Next Route

Next route is CM-1921 exact-approved transport diagnosis execution.

CM-1921 must not start until Jenn provides a current explicit exact approval matching this CM-1920 packet.
