# CM-1532 Live HTTP Runtime Freshness Guard Hardening

## Goal

Close the proof gap identified by CM-1531: a healthy live HTTP MCP process could be stale relative to current source. CM-1532 hardens local runtime freshness checks so future Phase F1 / live proof execution cannot silently proceed against an old process or old loaded source.

This task does not execute live client proof, close the live client evidence blocker, close the effective write reliability blocker, perform effective `record_memory`, call provider/API, use bearer-token material, perform raw memory/audit/broad scan, execute confirmed mutation, expand public MCP tools, release/tag/deploy, or claim readiness / `RC_READY`.

## Implemented Changes

| Area | Change |
|---|---|
| Runtime fingerprint helper | Added `src/core/RuntimeFreshness.js` with deterministic SHA-256 fingerprint over a bounded runtime source file set. |
| Fingerprint CLI | Added `scripts/print-runtime-fingerprint.js`, which prints only the bounded source fingerprint. |
| HTTP health | `createStreamableHttpServer(...)` now accepts `runtimeFreshness` and exposes a low-disclosure `runtimeFreshness` object on `/health`. |
| HTTP startup | `src/http-index.js` computes the runtime source fingerprint at process startup and passes it into HTTP health metadata with `startedAt`. |
| Ensure script | `scripts/ensure-codex-memory-http.ps1` computes the expected fingerprint locally and no longer accepts `/health` alone. A healthy runtime must match the current source fingerprint, otherwise the script fails closed. |
| Phase F1 runner | `runPhaseF1LiveClientNoWriteEvidence(...)` requires an expected runtime source fingerprint before execution and requires `/health.runtimeFreshness.sourceFingerprint` to match before accepting evidence. |
| Regression tests | Added `tests/live-http-runtime-freshness-guard.test.js` and updated existing HTTP / Phase F1 / CM-1531 diagnosis tests. |

## Public Contract Effect

```text
public MCP tools count: unchanged
public MCP tools expected: 7
public MCP expansion: 0
health metadata added: runtimeFreshness
health metadata disclosure level: bounded source fingerprint only
```

`runtimeFreshness` exposes:

```text
algorithm
sourceFingerprint
sourceFileCount
startedAt
```

It does not expose bearer-token material, provider/API payloads, raw memory, raw audit, filesystem paths, memory ids, or public MCP schema expansion.

## Freshness Behavior

```text
fresh runtime:
  /health.ok == true
  /health.runtimeFreshness.sourceFingerprint == locally computed expected fingerprint
  ensure script passes

stale or unknown runtime:
  /health.ok may be true
  source fingerprint missing or mismatched
  ensure script fails closed
  Phase F1 runner evidence is not accepted
```

## Validation Evidence

```text
node --test tests\live-http-runtime-freshness-guard.test.js
  pass: 4/4

node --test tests\phase-f1-live-client-no-write-runner.test.js
  pass: 8/8

node --test tests\mcp-http.test.js
  pass: 27/27

node --test tests\live-runtime-low-disclosure-mismatch-diagnosis.test.js
  pass: 4/4
```

Additional required validation is recorded in `.agent_board/VALIDATION_LOG.md`.

## Blocker Effect

```text
live client evidence blocker: STILL_OPEN
effective write reliability blocker: OPEN / DEFERRED
RC_READY: BLOCKED
status: NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```

CM-1532 makes future proof freshness safer, but it does not itself rerun the live proof or close the live client evidence blocker.

## Boundary Confirmation

```text
live_client_proof_execution: 0
live_client_proof_closeout: 0
live_client_blocker_closed: false
effective_write_blocker_closed: false
provider_api_calls: 0
bearer_token_use: 0
raw_memory_scan: 0
raw_audit_scan: 0
broad_memory_scan: 0
effective_record_memory_writes: 0
confirmed_mutation: 0
public_mcp_expansion: 0
release_tag_deploy: 0
readiness_claim: false
rc_ready_claim: false
```

## Next Route

Recommended next route: prepare an exact runtime refresh / no-bearer live proof retry packet that explicitly permits refreshing only the local loopback HTTP MCP process and requires a matching runtime source fingerprint before proof calls.
