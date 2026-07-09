# CM-1918 Runtime Target Diagnosis Preflight

Status: `COMPLETED_VALIDATED_RUNTIME_TARGET_DIAGNOSIS_PREFLIGHT_SOURCE_ONLY_NO_LIVE_CALL`

Date: 2026-07-04

## Scope

CM-1918 defines the source-only / docs-only preflight for diagnosing the CM-1916 `transport_error`.

CM-1918 does not decide which possible cause is true. It only defines diagnosis dimensions, allowed low-disclosure evidence, forbidden material, and which later checks require new exact approval.

CM-1918 does not perform live calls, retry CM-1916, call VCPToolBox, read endpoints, read config/env, read secrets, read logs, read response bodies, read raw memory, write memory, generate request bodies, generate approval lines, or claim readiness.

## Input Facts

Accepted from CM-1917:

```text
cm1916_receipt_valid=true
cm1916_statusCategory=transport_error
approved_live_network_call_count=1
approved_budget_remaining=0
runtimeReachable=false
componentActionReachable=not_proven
responseShapeKnown=false
readShapeRouteSupported=false
next_route=runtime_target_diagnosis
```

## Possible Cause Families

CM-1918 keeps these as possible cause families only:

- target reference did not resolve to a reachable transport
- local runtime was not running
- route was unavailable
- auth boundary prevented useful status proof
- wrapper refused request body, so component/action was not exercised
- component/action alias mismatch
- runtime adapter lacks real binding

No cause family is confirmed by CM-1918.

## Diagnosis Matrix

### Target Reference Resolution

Allowed evidence:

- `targetReferenceName`
- `referencePresent`
- `locatorHashPresent`
- `locatorValueDisclosed=false`
- `endpointDisclosed=false`

Forbidden:

- endpoint URL
- config/env path or content
- token or auth material
- raw locator value

Live approval requirement: not required for source-only reference-shape review, required before resolving or exposing any real transport locator.

### Transport Reachability

Allowed evidence for a future exact-approved check:

- `statusOnly`
- `noBody`
- `noLog`
- `noSecret`
- `statusClass`
- `durationBucket`

Forbidden:

- response body
- raw error payload
- endpoint disclosure
- runtime log
- config/env
- auth material

Live approval requirement: required before any new runtime/network call. CM-1916 budget is exhausted.

### Runtime Process State

Allowed evidence for a future exact-approved check:

- `runningOrNotRunning`
- `processCountBucket`
- `commandLineRedacted=true`
- `envRead=false`

Forbidden:

- full command line if it contains secrets or private paths
- env values
- raw logs
- process output

Live approval requirement: required if the check inspects live process state outside source-only manifests.

### Component/Action Mapping

Allowed evidence:

- `componentKnown`
- `actionKnown`
- manifest/source alias names only
- mapping status category only

Forbidden:

- raw plugin config
- private memory content
- request body
- provider payload

Live approval requirement: not required for source-only alias review, required before exercising component/action through runtime.

### Harness Binding

Allowed evidence:

- `wrapperPlanValid`
- `targetReferenceName`
- `profile`
- `component`
- `action`
- `noWriteBudgetZero=true`
- `bodyBudgetZero=true`
- `responseBodyBudgetZero=true`

Forbidden:

- actual request body
- endpoint URL
- auth material
- raw response payload
- logs

Live approval requirement: not required for source-only harness plan review, required before any live wrapper call.

## CM-1919 Contract Target

CM-1919 should turn this matrix into a machine-verifiable source/test contract:

```text
src/core/VcpNativeRuntimeTargetDiagnosisContract.js
tests/vcp-native-runtime-target-diagnosis-contract.test.js
docs/VCP_MEMORY_PLAN_PACKAGE_CM1919_RUNTIME_TARGET_DIAGNOSIS_CONTRACT.md
```

The contract should accept a low-disclosure diagnosis object and return an accepted result only when locator values, endpoints, config/env, secrets, logs, raw response material, raw memory, request bodies, write paths, and readiness claims remain absent.

## Explicit Non-Actions

CM-1918 did not:

- perform a new live call
- retry CM-1916
- call VCPToolBox
- call MCP memory tools
- resolve or disclose endpoint/locator values
- read response body, logs, stdout, stderr, config/env, secrets, raw memory, raw stores, or raw audit rows
- inspect live process state
- generate or submit request bodies
- generate, expose, store, or submit approval lines
- write memory or durable runtime/audit state
- change config, startup, watchdog, dependencies, runtime binding, or public MCP schema
- push, tag, release, deploy, or cut over
- claim readiness, `RC_READY`, production readiness, release readiness, cutover readiness, complete V8, or full bridge completion

## Validation Boundary

CM-1918 validation is docs/status/governance only:

```text
git diff --check
bash scripts/validate-local.sh docs
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted secret/readiness/raw-output scan over changed files
changed-scope re-review
```
