# CM-1015 CM0737 Bounded Write Proof Execution

Status: `CM1015_CM0737_BOUNDED_WRITE_PROOF_PASSED_NOT_RELIABLE_NOT_READY`
Date: 2026-05-25
Scope: exactly one sanitized in-process CM0737-bound `record_memory` write proof
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

CM-1015 records one bounded write proof through the existing opt-in app seam:

```text
createCodexMemoryApplication({ enableWritePreflight: true })
-> app.callTool('record_memory', ...)
```

This proof uses the CM-0737-bound write proof preflight/result boundary chain. It is a real local durable write, but it is still not `memory write reliable`, not `memory recall reliable`, not governance closure, not runtime ready, not RC ready, not production ready, not release ready, and not cutover ready.

## Preflight

Command:

```text
node .\src\cli\write-proof-current-facts-preflight.js --json --pretty
```

Result:

```text
decision = WRITE_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED
acceptedForExecutionPreflight = true
branch = main
localHead = 60f2544378e163fa83de6a42f7914af0b5b309a4
originHead = 60f2544378e163fa83de6a42f7914af0b5b309a4
remoteMainHead = 60f2544378e163fa83de6a42f7914af0b5b309a4
dirtyStatusLineCount = 0
```

Preflight remained non-executing and reported `preflightOnly=true`, `separateLiveWriteApprovalRequired=true`, and `implicitWriteAuthorizationGranted=false`.

## Execution Evidence

The proof executed exactly one sanitized `record_memory` call with:

```text
baselineCommit = 60f2544378e163fa83de6a42f7914af0b5b309a4
proofRunId = CM1015-60f2544-cm0737-bounded-write-proof
target = process
approvalMatched = true
payloadHash = a6785ca0f6d3ce566f6ca6421083997a616326f009a6212461c69b77dc1c6c0a
```

Sanitized result:

```text
decision = MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY
accepted = true
memoryIdHashOrOpaqueId = 6b158de28cb1166e
shadowWriteStatus = ok
writeAuditSummary.status = append_observed_by_in_process_counter
writeAuditSummary.appendedCount = 1
writeAuditSummary.sanitizedOnly = true
```

No raw memory content, raw audit entry, direct `.jsonl` line, durable path, secret value, or raw file path was printed.

## Side-Effect Counters

The in-process proof wrapper recorded:

```json
{
  "recordMemoryCalls": 1,
  "acceptedMemoryWrites": 1,
  "rejectedMemoryWrites": 0,
  "durableMemoryWrites": 1,
  "durableAuditWrites": 1,
  "searchMemoryCalls": 0,
  "providerCalls": 0,
  "apiCalls": 0,
  "directJsonlReads": 0,
  "rawDurableMemoryReads": 0,
  "rawAuditReads": 0,
  "memoryOverviewCalls": 0,
  "publicMcpExpansion": 0,
  "migrationImportExportBackupRestoreApply": 0,
  "configWatchdogStartupChanges": 0,
  "packageLockfileChanges": 0,
  "tagReleaseDeployCutoverActions": 0,
  "readinessClaims": 0,
  "reliabilityClaims": 0
}
```

The result was consumed by `WriteProofExecutionResultBoundary`:

```text
status = WRITE_PROOF_RESULT_BOUNDARY_ACCEPTED_NOT_READY
acceptedForBoundedWriteProofReview = true
blockerReasons = []
```

## Post-Write Freshness Check

Command:

```text
node .\src\cli\store-freshness-write-preflight.js --json
```

Result:

```text
decision = STORE_FRESHNESS_EVIDENCE_NOT_REQUIRED
records = 6
chunks = 11
last24h = 2
last7d = 3
last30d = 6
mutated = false
```

This was a dry-run store freshness check after the proof. It did not execute another memory write.

## Validation

Targeted tests passed:

```text
node --test .\tests\write-proof-execution-result-boundary.test.js .\tests\write-proof-execution-preflight.test.js .\tests\write-proof-current-facts-preflight-cli.test.js
```

Result:

```text
18/18 passed
```

## Boundary

This proof did execute one local durable `record_memory` write and one write-audit append.

It did not execute `search_memory`, did not call providers/APIs, did not read raw memory, did not read direct `.jsonl`, did not read raw durable audit, did not call `memory_overview`, did not expand public MCP, did not run migration/import/export/backup/restore apply, did not change package/lockfile/config/watchdog/startup state, did not tag/release/deploy/cutover, and did not claim readiness or reliability.

## Interpretation

CM-1015 is stronger write-path evidence than the prior non-mutating write proof boundaries because it proves one clean synced CM0737-bound proof payload can pass through the opt-in app seam and land in diary/shadow/vector/chunk/audit with `shadowWriteStatus=ok`.

It still does not prove:

- broad `record_memory` reliability
- unattended/default-on write reliability
- long-run durability
- rollback cleanup sufficiency
- multi-client behavior
- broad write-to-recall reliability
- governance lifecycle closure
- production readiness

`memory write reliable` remains not claimed and `RC_NOT_READY_BLOCKED` remains.
