# V8 TagMemo Recall Composition Sprint C Preflight

## Scope

CM-1581 opens V8 TagMemo Recall Foundation Sprint C as a docs-only preflight for a bounded recall composition pipeline.

This preflight does not implement runtime integration, does not persist tag enrichment, does not expand public MCP tools or responses, does not call provider/API paths, does not use bearer tokens, does not run raw scans or broad memory scans, does not execute live proof, does not perform confirmed mutation, and does not execute a second effective `record_memory` write.

## Goal

Design an internal bounded recall composition layer that can later compose the audited Sprint A/B pure functions:

```text
tag extraction
importance scoring
query expansion
association recall
time-decay scoring
recall ranking
```

The first Sprint C source step, if separately authorized later, should remain internal, deterministic, fixture-backed, and no-op on invalid or insufficient bounded input.

## Proposed Composition Order

Required composition order:

```text
query expansion
  -> association recall
  -> time decay
  -> importance scoring
  -> recall ranking
```

Supporting bounded projections:

```text
tag extraction
  -> bounded tag projection
  -> query expansion / association recall / ranking inputs
```

Rationale:

- Query expansion should operate on the bounded query and safe TagMemo/evidence projections before candidate scoring.
- Association recall should use bounded expanded-query hints, bounded tag projections, and bounded candidate projections only.
- Time-decay should score safe recency before final ranking, without raw timestamps.
- Importance scoring should remain deterministic and bounded; it can provide candidate scoring input without dominating ranking.
- Recall ranking should be the final internal ordering step over bounded candidates and bounded scores.

## Proposed Module Boundary

Future source module, not implemented in CM-1581:

```text
src/tagmemo/recall-composition.js
```

Proposed exported function:

```text
composeTagMemoRecall(input)
```

The function should call existing audited pure functions only after the input is projected into bounded shapes. It must not import storage, MCP adapters, provider clients, HTTP clients, file-system readers, runtime write services, or raw memory readers.

## Input Contract

Allowed input:

```text
schemaVersion: tagmemo-recall-composition-input-v1
boundedQueryText
recallIntent
boundedMemoryText
boundedMetadataProjection
boundedCandidates[]
safeRecency
safeEvidenceHints
tagProjection
```

Allowed candidate fields:

```text
memoryId
boundedMemoryText
boundedMetadataProjection
tagProjection
safeRecency
safeEvidenceHints
importanceScore
queryExpansionHints
```

Forbidden input:

```text
raw memory record
raw chat transcript
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
public MCP request/response mutation payload
```

## Output Contract

Proposed bounded output:

```text
schemaVersion: tagmemo-recall-composition-output-v1
compositionVersion: deterministic_v1
expandedQueries[]
associatedCandidates[]
candidateScores[]
rankedCandidates[]
compositionReasons[]
rejected
reason
lowDisclosure
mutated: false
providerCalls: 0
publicMcpExpansion: 0
persisted: false
publicResponse: false
```

The output must not include raw memory, raw candidate records, token-shaped data, provider/API payloads, storage paths, or raw audit details.

## Failure And No-Op Behavior

The future composition layer should:

- fail closed on unsupported input fields
- return low-disclosure `rejected=true` output for forbidden raw/private fields
- return low-disclosure `empty_input` or `empty_candidates` where applicable
- treat partial internal scoring failures as bounded no-op for that scoring stage
- never block existing write or recall runtime paths unless a later approved integration phase explicitly defines that behavior
- never persist generated tags, associations, decay state, scores, or ranking output in this preflight lane
- never include projection output in public MCP responses in this preflight lane

## Fixture And Test Plan

Future fixture/test coverage should include:

```text
tests/fixtures/tagmemo-recall-composition-sprint-c-v1.json
tests/tagmemo-recall-composition.test.js
```

Required cases:

- deterministic same-input same-output
- query expansion feeds association recall with bounded hints
- association candidates receive time-decay and importance scoring inputs
- recall ranking consumes bounded composition scores without raw/private fields
- duplicate signals merge deterministically
- empty query returns low-disclosure output
- empty candidate list returns low-disclosure output
- forbidden provider/API/token/raw/path/timestamp-shaped input rejects without leakage
- public MCP surface remains seven tools
- output records `mutated=false`, `persisted=false`, `publicResponse=false`, `providerCalls=0`, and `publicMcpExpansion=0`

## Explicit Non-Goals

```text
runtime integration: NOT_STARTED
persistent tag enrichment: NOT_STARTED
persistent association graph: NOT_STARTED
persistent decay state: NOT_STARTED
public MCP expansion: NOT_STARTED
provider/API: NOT_USED
bearer token: NOT_USED
raw scan: NOT_RUN
broad memory scan: NOT_RUN
live proof: NOT_EXECUTED
confirmed mutation: NOT_EXECUTED
second effective record_memory write: NOT_EXECUTED
release/tag/deploy: NOT_EXECUTED
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Validation

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
changed-scope review
staged diff check
```

Results:

```text
git diff --check: PASS
validate-local.ps1 -Area docs: PASS
CURRENT_FACTS.json parse: PASS
changed-scope review: PASS_DOCS_ONLY_NO_RUNTIME_INTEGRATION
```
