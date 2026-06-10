# V8 TagMemo Runtime Recall Integration Sprint D Preflight

## Scope

Sprint D bounded runtime recall integration preflight.

This is docs/design/test-plan work only. It does not connect recall composition to runtime, does not change `search_memory`, does not persist recall composition output, and does not expose new public MCP response fields.

Operator route label:

```text
V8_TAGMEMO_RECALL_FOUNDATION_SPRINT_D_PRELIGHT
```

Normalized route name:

```text
V8_TAGMEMO_RUNTIME_RECALL_INTEGRATION_SPRINT_D_PREFLIGHT
```

## Current Baseline

```text
tag extraction: IMPLEMENTED_AND_AUDITED
importance scoring: IMPLEMENTED_AND_AUDITED
query expansion: IMPLEMENTED_AND_AUDITED
association recall: IMPLEMENTED_AND_AUDITED
time-decay scoring: IMPLEMENTED_AND_AUDITED
recall ranking: IMPLEMENTED_AND_AUDITED
recall composition: IMPLEMENTED_AND_AUDITED
```

## Required Boundaries

```text
runtime integration: NOT_STARTED
persistent tag enrichment: NOT_STARTED
public MCP surface: STILL_7_TOOLS
provider/API: NOT_USED
bearer token: NOT_USED
raw scan: NOT_RUN
broad memory scan: NOT_RUN
live proof: NOT_EXECUTED
confirmed mutation: NOT_EXECUTED
public MCP expansion: NOT_EXECUTED
second effective record_memory write: NOT_EXECUTED
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Proposed Integration Boundary

The first safe runtime route should be an internal no-op projection path, not persistent enrichment and not public response expansion.

Candidate internal position:

```text
search_memory request
  -> existing bounded candidate generation / filtering
  -> bounded candidate projection
  -> optional internal recall composition no-op projection
  -> existing search_memory ranking / response shaping
```

The preflight-preferred route is after existing candidate narrowing and before any final internal ranking decision that would be allowed to consume bounded projection signals. This avoids raw scans and broad memory scans because recall composition receives only already-selected bounded candidates.

## Call Site Map

Potential future source entrypoints to review before implementation:

```text
src/core/MemorySearchService.js
src/recall/*
src/tagmemo/recall-composition.js
```

Proposed future adapter shape:

```text
src/tagmemo/runtime-recall-noop-projection.js
```

The adapter would accept a bounded runtime projection and call `composeTagMemoRecall(...)`. It would return an internal no-op projection envelope with explicit non-persistence and non-public flags.

## Input Contract

Only bounded projections may enter the future adapter:

```text
bounded query text
bounded recall intent
bounded seed / request projection
bounded memory candidates
TagMemo tag projection
deterministic importance score or bounded scoring input
safe recency metadata
safe evidence hints
```

Forbidden input:

```text
raw memory record
raw diary text
raw audit
raw scan output
broad memory scan output
provider/API payload
bearer token
client secret
raw storage/vector/cache/file path payload
unbounded lifecycle metadata
```

## Output Contract

Future no-op output should remain internal:

```text
compositionVersion
expandedQueries
associatedCandidates
candidateScores
rankedCandidates
compositionReasons
lowDisclosure
mutated=false
persisted=false
publicResponse=false
providerCalls=0
publicMcpExpansion=0
```

The output must not enter public MCP responses unless a later separately approved phase explicitly changes that public contract. `rankReasons`, association reasons, and scoring signals must remain internal or be stripped before response shaping.

## Failure Behavior

Failures should be fail-closed or no-op:

```text
invalid bounded projection -> low-disclosure no-op
empty candidate projection -> low-disclosure no-op
rejected forbidden field -> low-disclosure no-op
composition error -> low-disclosure no-op
```

Failure must not alter the `search_memory` main path, must not trigger persistence, and must not issue a second effective `record_memory` write.

## Test Plan

Future source/test slice should add fixture-backed coverage for:

```text
bounded candidate projection only
no raw scan or broad memory scan shaped input
no provider/API/token shaped input
no public MCP response leakage of rankReasons
no persistence side effect
no second effective record_memory write
composition failure returns no-op and preserves search main path
public MCP surface remains seven tools
deterministic output over same bounded candidates
```

Recommended future test file:

```text
tests/tagmemo-runtime-recall-noop-projection.test.js
```

## Rollback Plan

Because this step is docs-only, rollback is a Git revert of this preflight document and status/board updates.

For a future source implementation, rollback should remove the internal adapter and its call site without touching public MCP schemas, persistence, provider configuration, startup/watchdog configuration, or durable memory stores.

## Next Route

Recommended next step after this preflight:

```text
Sprint D bounded runtime recall no-op projection fixture/test coverage
```

Do not proceed directly to runtime integration without fixture/test coverage and a separate source implementation task.
