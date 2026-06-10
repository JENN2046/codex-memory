# V8 TagMemo Recall Ranking Baseline

## Scope

This document prepares the deterministic recall ranking baseline for Sprint A.

The baseline is local, deterministic, fixture-backed, and internal-only. It is not live search, does not read raw memory, does not perform raw scans, does not call provider/API paths, does not write memory, does not persist tag enrichment, and does not expand public MCP tools.

## Planned Module

```text
src/tagmemo/recall-ranking.js
```

Planned exported function:

```text
rankTagMemoCandidates(input, options = {})
```

## Input Contract

Allowed input:

- bounded query text;
- bounded memory candidates;
- TagMemo tag projection;
- deterministic `importanceScore`;
- safe recency metadata.

Forbidden input:

- raw memory record;
- token or bearer material;
- provider/API payload;
- raw audit;
- raw scan output;
- client secret;
- raw storage, vector, cache, or file path payloads;
- unbounded lifecycle metadata.

## Output Contract

```text
rankedCandidates[]
rankScore
rankReasons[]
rankVersion: deterministic_v1
```

Rejected or empty candidate input must return low-disclosure output and must not echo forbidden values.

## Deterministic Signals

- Tag matches increase rank score.
- Query term matches increase rank score.
- `importanceScore` participates but does not dominate every other signal.
- Safe recency hints participate deterministically.
- Decision, proof, route, and blocker evidence relevance increases rank score.
- Duplicate signal families are merged deterministically.
- Forbidden raw/private fields never enter `rankReasons`.

## Planned Tests

- Same input produces the same ranking.
- Higher tag match ranks higher.
- `importanceScore` participates but does not dominate everything.
- Safe recency hint participates deterministically.
- Forbidden raw/private fields do not enter `rankReasons`.
- Empty candidate list returns low-disclosure output.
- Rejected candidate returns low-disclosure output.

## Regression Fixture

CM-1566 adds fixture/test coverage:

```text
tests/fixtures/tagmemo-recall-ranking-sprint-a-v1.json
tests/tagmemo-recall-ranking.test.js
```

The first regression slice locks fixture shape, required ranking scenarios, forbidden-value placement, side-effect boundaries, and the seven-tool public MCP surface before source implementation.

## Boundary Confirmation

```text
runtime implementation: NOT_STARTED
recall ranking source implementation: NOT_STARTED
live search: NOT_RUN
raw scan: NOT_RUN
provider/API: NOT_USED
bearer token: NOT_USED
persistent tag enrichment: NOT_STARTED
public MCP expansion: NO
effective record_memory write: NOT_EXECUTED
complete V8: NOT_CLAIMED
production/release/cutover ready: NO
```

## Next Step

Add fixture-backed regression coverage before the source implementation.
