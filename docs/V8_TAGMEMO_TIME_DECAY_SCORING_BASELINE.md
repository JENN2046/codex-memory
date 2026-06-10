# V8 TagMemo Time-Decay Scoring Baseline

## Scope

CM-1578 establishes a simple deterministic TagMemo time-decay scoring baseline for Sprint B.

This is an internal pure-function baseline only. It does not persist decay state, does not modify memory records, does not read raw memory, does not run broad memory scans, does not call provider/API paths, does not use bearer tokens, does not execute live proof, does not perform confirmed mutation, and does not expand the public MCP surface.

## Source

```text
src/tagmemo/time-decay-scoring.js
tests/fixtures/tagmemo-time-decay-scoring-sprint-b-v1.json
tests/tagmemo-time-decay-scoring.test.js
```

## Input Contract

Allowed input:

```text
schemaVersion: tagmemo-time-decay-scoring-input-v1
memoryId: bounded memory id
safeRecency:
  bucket: current | recent | stable | older | archival | unknown
  sequence: bounded deterministic integer
safeEvidenceHints: bounded string[]
```

Forbidden input:

```text
raw memory record
raw timestamp
raw audit
raw scan output
broad memory scan output
provider/API payload
token or bearer material
client secret
storage/vector/cache payload
file path
unbounded lifecycle metadata
```

## Output Contract

```text
schemaVersion: tagmemo-time-decay-scoring-output-v1
decayVersion: deterministic_v1
memoryId
timeDecayScore: number between 0 and 1
timeDecayBand: low | medium | high
decayReasons: bounded string[]
rejected
reason
lowDisclosure
mutated: false
providerCalls: 0
publicMcpExpansion: 0
```

## Deterministic Rules

- Safe recency buckets provide the base score.
- Safe sequence adjusts only within a small bounded range.
- Durable evidence hints such as `decision`, `proof`, `route`, `blocker`, and `receipt` provide bounded retention.
- Temporary status hints such as `temporary`, `scratch`, `draft`, `transient`, and `noise` decay downward.
- Duplicate signals are merged and do not multiply blindly.
- Empty input returns a low-disclosure empty result.
- Rejected input returns a low-disclosure rejected result.
- Forbidden raw/private fields are stripped by rejection and do not enter output.

## Validation

```powershell
node --test tests\tagmemo-time-decay-scoring.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
changed-scope review
staged diff check
```

Results:

```text
tests\tagmemo-time-decay-scoring.test.js: PASS_10_OF_10
git diff --check: PASS
validate-local.ps1 -Area docs: PASS
CURRENT_FACTS.json parse: PASS
changed-scope review: PASS_NO_ACTIONABLE_FINDINGS_IN_CHANGED_SCOPE
```

## Audit Receipt

```text
audit_result: PASS_NO_ACTIONABLE_FINDINGS_IN_CHANGED_SCOPE
time-decay scoring baseline: IMPLEMENTED_AND_AUDITED
runtime integration: NOT_STARTED
persistent decay state: NOT_STARTED
persistent tag enrichment: NOT_STARTED
public MCP surface: STILL_7_TOOLS
provider/API: NOT_USED
bearer token: NOT_USED
raw scan: NOT_RUN
broad memory scan: NOT_RUN
confirmed mutation: NOT_EXECUTED
effective record_memory write: NOT_EXECUTED
complete V8: NOT_CLAIMED
production/release/cutover ready: NO
```
