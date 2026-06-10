# V8 TagMemo Importance Scoring Baseline

## Scope

This document prepares the deterministic memory importance scoring baseline for Sprint A.

The baseline is local, deterministic, fixture-backed, and internal-only. It is not model scoring, does not call provider/API paths, does not read raw memory, does not perform raw scans, does not write memory, does not persist tag enrichment, and does not expand public MCP tools.

## Planned Module

```text
src/tagmemo/importance-scoring.js
```

Planned exported function:

```text
scoreMemoryImportance(input, options = {})
```

## Input Contract

Allowed input:

- bounded memory text;
- bounded metadata projection;
- TagMemo tag projection;
- safe evidence hints.

Forbidden input:

- raw memory record;
- token or bearer material;
- provider/API payload;
- raw audit;
- raw scan output;
- client secret;
- unbounded lifecycle metadata.

## Output Contract

```text
importanceScore: number between 0 and 1
importanceBand: low | medium | high
scoringSignals: bounded string[]
scoreVersion: deterministic_v1
```

Rejected or empty input must return low-disclosure output and must not echo forbidden values.

## Deterministic Rules

- Explicit user instruction signals increase score.
- Decision, route, blocker, proof, and receipt signals increase score.
- Temporary status noise decreases score.
- Duplicate signals are merged deterministically and do not multiply blindly.
- Empty input returns a low-disclosure empty result.
- Rejected input returns a low-disclosure rejected result.

## Planned Tests

- `importanceScore` is stable and bounded from `0` to `1`.
- `importanceBand` is reproducible.
- Same input produces exactly the same output.
- Forbidden fields do not enter `scoringSignals`.
- Provider/API/token/raw shaped fields are rejected or stripped.
- Empty input is low-disclosure.
- Duplicate signal handling is reproducible.

## Regression Fixture

CM-1562 adds fixture/test coverage:

```text
tests/fixtures/tagmemo-importance-scoring-sprint-a-v1.json
tests/tagmemo-importance-scoring.test.js
```

The first regression slice locks fixture shape, required scoring scenarios, forbidden-value placement, side-effect boundaries, and the seven-tool public MCP surface before source implementation.

## Source Implementation

CM-1563 adds the internal pure-function core:

```text
src/tagmemo/importance-scoring.js
```

The implementation exports `scoreMemoryImportance(input, options = {})` and `SCORE_VERSION`.

Validation:

```text
tests\tagmemo-importance-scoring.test.js: PASS_9_OF_9
```

The implementation is deterministic, local-only, and bounded. It does not call provider/API paths, does not read raw memory, does not perform raw scans, does not persist tag enrichment, does not execute `record_memory`, and does not expand public MCP tools.

## Boundary Confirmation

```text
runtime implementation: IMPLEMENTED_INTERNAL_PURE_FUNCTION
provider/API: NOT_USED
bearer token: NOT_USED
raw scan: NOT_RUN
persistent tag enrichment: NOT_STARTED
public MCP expansion: NO
second effective record_memory write: NOT_EXECUTED
complete V8: NOT_CLAIMED
production/release/cutover ready: NO
```

## Next Step

Add fixture-backed regression coverage before the source implementation.
