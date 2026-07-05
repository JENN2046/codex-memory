# CM-1941 Low-Disclosure Startup Failure Diagnosis Contract

Status: `COMPLETED_VALIDATED_LOW_DISCLOSURE_STARTUP_FAILURE_DIAGNOSIS_CONTRACT_NO_LIVE_NO_MUTATION`

Date: 2026-07-05

## Scope

CM-1941 turns the CM-1940 startup failure diagnosis preflight into a local
machine-verifiable contract.

This task is source/test/docs only. It does not perform a live call, retry
CM-1938, start, stop, or restart runtime, inspect process state, recheck
listener reachability, read logs, stdout, stderr, config, env, secrets,
response bodies, raw error payloads, raw memory, raw stores, or raw audit rows,
disclose endpoint or locator values, generate request bodies, generate approval
lines, probe component/action routing, enter read-shape proof, write memory, or
claim readiness.

## Source

```text
src/core/VcpNativeStartupFailureDiagnosisContract.js
tests/vcp-native-startup-failure-diagnosis-contract.test.js
```

## Contract Input

The contract accepts only category, bucket, boolean, and zero-counter fields for:

- startup invocation shape
- startup process lifecycle
- startup result capture
- listener after start
- target safe-reference binding
- optional operator-mediated manual evidence
- approval boundary

It preserves that runtime startup state, process count, startup result, listener
status after startup, target locator binding, component/action routing, and
read-shape support remain unproven.

## Accepted Output

```yaml
diagnosis_result:
  accepted: true
  startupInvocationShapeContracted: true
  startupProcessLifecycleKnown: false
  processCountBucketDisclosed: false
  startupResultKnown: false
  listenerAfterStartKnown: false
  targetReferenceKnown: true
  targetLocatorBindingKnown: false
  operatorManualEvidenceAccepted: false
  endpointDisclosed: false
  locatorValueDisclosed: false
  componentActionStatusProbeUnlocked: false
  readShapeUnlocked: false
  nextLiveDiagnosticRequiresExactApproval: true
```

Zero side-effect flags remain false for runtime execution, VCPToolBox calls,
network calls, process inspection, service start/stop/restart, listener recheck,
endpoint/locator disclosure, config/env/secret/log/stdout/stderr/body/raw-output
reads, request body generation, approval-line operations, memory reads/writes,
durable writes, provider/API calls, runtime/config/startup/watchdog/dependency
changes, public MCP expansion, and readiness claims.

## Rejection Rules

The contract fails closed for:

- missing required lane fields
- unknown fields
- nonzero or unknown counters
- unsafe or mismatched target references
- endpoint or locator values
- command line values
- process identifiers
- config paths or values
- env values
- secrets, tokens, credentials, keys, or auth material
- raw response bodies
- raw error payloads
- stdout, stderr, or log text
- raw memory, raw stores, or raw audit rows
- request bodies
- approval-line material
- provider payloads
- component/action probe claims
- read-shape proof claims
- readiness, release, deploy, cutover, complete V8, or full bridge completion
  claims

Rejected results do not echo private values.

## Decision

```yaml
decision:
  cm1940_preflight_consumed: true
  contract_implemented: true
  source_added: true
  tests_added: true
  startup_failure_diagnosis_contract_locked: true
  accepted_evidence: category_bucket_boolean_zero_counter_only
  runtime_facts_created: false
  live_execution_allowed_now: false
  process_state_inspection_allowed_now: false
  service_start_allowed_now: false
  listener_recheck_allowed_now: false
  endpoint_disclosed: false
  locator_value_disclosed: false
  component_action_status_probe_unlocked: false
  read_shape_unlocked: false
  next_live_diagnostic_requires_exact_approval: true
  readiness_claimed: false
  next_route: cm1942_startup_failure_diagnosis_exact_approval_request_packet
```

## Validation Boundary

CM-1941 validation:

```text
node --check src/core/VcpNativeStartupFailureDiagnosisContract.js
node --check tests/vcp-native-startup-failure-diagnosis-contract.test.js
node --test tests/vcp-native-startup-failure-diagnosis-contract.test.js
npm test -- --summary
git diff --check
bash scripts/validate-local.sh docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS JSON OK')"
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted endpoint/locator/approval-line/secret/raw-output/readiness scan over changed files
changed-scope re-review
```
