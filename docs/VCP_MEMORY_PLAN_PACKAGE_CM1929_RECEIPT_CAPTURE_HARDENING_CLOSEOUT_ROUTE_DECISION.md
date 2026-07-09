# CM-1929 Receipt-Capture Hardening Closeout / Future Live Request Route Decision

## Purpose

CM-1929 closes the CM-1928 receipt-capture hardening slice and decides whether
the route may return to a future exact approval request packet.

This is a route decision only. It does not execute runtime, retry CM-1926, call
VCPToolBox, generate a request body, generate an approval line, or approve any
future live action.

## Reviewed Evidence

Accepted local evidence:

- CM-1926 consumed one exact-approved startup / locator diagnosis attempt.
- CM-1926 ended with `receipt_capture_error_after_single_approved_attempt`.
- CM-1927 closed that attempt as inconclusive and blocked retries.
- CM-1928 added a deterministic receipt-capture contract.
- CM-1928 targeted tests passed `7/7`.
- CM-1928 default tests passed `3997/3997`.
- CM-1928 preserved unchanged public MCP surface.

## Decision

```yaml
decision:
  cm1928_contract_valid: true
  receipt_capture_hardening_closed: true
  receipt_capture_deterministic_for_injected_outcomes: true
  live_runtime_facts_created: false
  runtime_startup_state_known: false
  process_count_known: false
  target_locator_binding_success_known: false
  service_listener_reachability_known: false
  component_action_status_probe_unlocked: false
  read_shape_unlocked: false
  cm1926_retry_allowed: false
  future_live_request_packet_preparation_allowed: true
  future_live_execution_allowed: false
  next_route: cm1930_startup_locator_diagnosis_exact_approval_request_packet_refresh
```

## Why This Route Is Valid

CM-1928 fixes the specific governance gap exposed by CM-1926: a future startup
/ locator diagnosis must have deterministic receipt-capture handling even when
the live attempt returns `connect_success`, `transport_error`, `timeout`, or a
capture failure category.

That is enough to prepare a new non-authorizing exact approval request packet.
It is not enough to execute another live attempt.

## CM-1930 Route

CM-1930 should prepare only a non-executing request packet refresh for a future
startup / locator diagnosis attempt.

The packet should preserve:

- `purpose=runtime_startup_or_target_locator_diagnosis`
- safe target reference only
- max network calls `1`
- max runtime calls `1`
- optional process-state inspection only if explicitly requested in the packet
- request body generation false
- response body byte budget `0`
- raw error payload budget `0`
- log read budget `0`
- stdout/stderr read false
- config/env read false
- secret read false
- endpoint disclosure false
- locator value disclosure false
- memory read false
- memory write false
- durable write false
- provider/API call false
- public MCP expansion false
- low-disclosure receipt projection only
- CM-1928 receipt-capture contract as a required pre-live boundary

CM-1930 must remain non-authorizing. It must not include a real approval line
and must not execute runtime.

## Forbidden In CM-1929

CM-1929 does not:

- perform a live call
- retry CM-1926
- call VCPToolBox
- inspect process state
- resolve or disclose endpoint / locator values
- read config, env, secrets, logs, stdout, stderr, response bodies, raw error
  payloads, raw memory, raw stores, or raw audit rows
- generate request bodies
- generate, expose, submit, or store approval lines
- write memory or durable state
- change config/startup/watchdog/dependencies/runtime binding
- expand public MCP tools
- push, tag, release, deploy, or cut over
- claim readiness, `RC_READY`, complete V8, or full bridge completion

## Stop Conditions

Stop before any future live action unless Jenn provides a new current exact
approval that matches a refreshed request packet.

Stop before any request-body generation, endpoint disclosure, locator value
disclosure, log/config/env/secret read, raw output read, memory read/write,
durable write, runtime binding mutation, public MCP expansion, release, deploy,
cutover, push, or readiness claim.
