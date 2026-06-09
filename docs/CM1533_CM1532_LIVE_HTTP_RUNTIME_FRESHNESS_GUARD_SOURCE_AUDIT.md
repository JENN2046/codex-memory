# CM-1533 Audit of CM-1532 Live HTTP Runtime Freshness Guard

## Goal

Perform an independent changed-scope source audit of the CM-1532 live HTTP runtime freshness guard without executing live proof, closing the live client evidence blocker, closing the effective write reliability blocker, or claiming readiness / `RC_READY`.

## Scope Reviewed

Reviewed changed-scope files and adjacent contract surfaces:

- `src/core/RuntimeFreshness.js`
- `scripts/print-runtime-fingerprint.js`
- `scripts/ensure-codex-memory-http.ps1`
- `scripts/serve-codex-memory-http.js`
- `src/http-index.js`
- `src/adapters/codex-mcp/http.js`
- `src/adapters/codex-mcp/server.js`
- `src/core/constants.js`
- `src/core/PhaseF1LiveClientNoWriteEvidenceRunner.js`
- `tests/live-http-runtime-freshness-guard.test.js`
- `tests/phase-f1-live-client-no-write-runner.test.js`
- `tests/mcp-http.test.js`
- `tests/live-runtime-low-disclosure-mismatch-diagnosis.test.js`
- `docs/CM1532_LIVE_HTTP_RUNTIME_FRESHNESS_GUARD_HARDENING.md`

## Confirmed Within Changed Scope

### `/health.runtimeFreshness` is bounded

Confirmed.

`buildRuntimeFreshness(...)` projects only:

```text
algorithm
sourceFingerprint
sourceFileCount
startedAt
```

The HTTP tests lock the low-disclosure `/health` key set and `runtimeFreshness` key set, and assert the serialized health response does not include bearer material, authorization headers, memory ids, audit paths, diary paths, candidate-cache paths, provider endpoints, or embedding profile details.

The projection does not expose the bounded source file list from `RuntimeFreshness.js`; it exposes only count and fingerprint.

### `ensure-codex-memory-http.ps1` does not accept healthy-only stale runtime

Confirmed.

The ensure script computes the expected runtime fingerprint with `scripts/print-runtime-fingerprint.js`, then accepts an existing HTTP process only when `/health.ok == true` and `/health.runtimeFreshness.sourceFingerprint` matches the expected value.

A healthy runtime with missing or mismatched freshness metadata fails closed with an error. The script does not silently pass because `/health` is healthy.

### Stale runtime fail-closed behavior

Confirmed for `ensure-codex-memory-http.ps1`.

The ensure path fails closed on healthy-but-stale runtime instead of accepting it. It does not auto-restart an already healthy stale process in this implementation.

### `serve-codex-memory-http.js` and startup freshness

Confirmed.

`scripts/serve-codex-memory-http.js` bootstraps user environment, changes working directory to the repository root, and requires `src/http-index.js`. `src/http-index.js` computes the runtime source fingerprint at process startup and passes it into HTTP health metadata with `startedAt`.

### Public MCP surface remains seven tools

Confirmed in source and regression coverage.

The public tool list is still the seven-tool surface:

```text
audit_memory
memory_overview
record_memory
search_memory
supersede_memory
tombstone_memory
validate_memory
```

`TOOL_DEFINITIONS` contains exactly these seven entries, MCP `tools/list` returns `TOOL_DEFINITIONS`, and tests assert `tools.length == 7` plus the Phase F1 runner exact tool list.

### No live proof automatic execution introduced

Confirmed for this audit and source default path.

This audit executed no live proof. The runner remains explicit-execution gated: `runPhaseF1LiveClientNoWriteEvidence(...)` returns plan-only output when `execute` is false.

### Forbidden boundaries

Confirmed for this audit.

```text
live_client_proof_execution: 0
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
live_client_blocker_closed: false
effective_write_blocker_closed: false
```

## Residual Finding

```text
CM-1533_FINDING: PHASE_F1_RUNTIME_FRESHNESS_MATCH_NOT_SHORT_CIRCUITED_BEFORE_PROOF_REQUESTS
```

The Phase F1 runner requires `expectedRuntimeSourceFingerprint` before network execution and accepts evidence only when `/health.runtimeFreshness.sourceFingerprint` matches it.

However, after the runner fetches `/health`, current source does not immediately stop on a mismatched health fingerprint before issuing the subsequent `initialize`, `tools/list`, and bounded `tools/call` proof requests. The mismatch is evaluated later during `evidenceAccepted`.

Therefore:

- `stale evidence accepted`: no
- `stale evidence fail-closed`: yes, at final evidence acceptance
- `proof requests short-circuit before health fingerprint match`: not confirmed

The current tests cover missing expected runtime fingerprint and accepted matching fingerprint. They do not cover mismatched `/health.runtimeFreshness.sourceFingerprint` preventing subsequent proof requests.

## Blocker Effect

```text
live client evidence blocker: STILL_OPEN
effective write reliability blocker: OPEN / DEFERRED
RC_READY: BLOCKED
status: NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```

This audit does not close live/effective-write blockers and does not claim readiness.

## Recommended Next Local Source/Test Slice

Add a Phase F1 runner source/test hardening slice that:

1. Fetches `/health`.
2. Checks `runtimeFreshness.matchesExpected`.
3. Returns fail-closed before `initialize`, `tools/list`, or any `tools/call` proof request when the health fingerprint is missing or mismatched.
4. Adds a regression test proving no HTTP JSON proof requests are made after mismatched health freshness.

That future slice should remain local source/test only unless separately authorized for live proof execution.
