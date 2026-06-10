# V8 TagMemo Association Recall Baseline

## Scope

This document prepares the deterministic association recall baseline for Sprint B.

The baseline is local, deterministic, fixture-backed, and internal-only. It does not build or persist a relation graph, does not perform live search, does not read raw memory, does not perform raw scans or broad memory scans, does not call provider/API paths, does not write memory, does not persist tag enrichment, and does not expand public MCP tools.

## Sprint B Task Mapping

The user task book referred to this as Phase 5 / `CM-1564`. Repository reality already uses `CM-1560..CM-1569` for Sprint A. This Sprint B phase is recorded as `CM-1574` to preserve the committed evidence chain.

## Planned Module

```text
src/tagmemo/association-recall.js
```

Planned exported function:

```text
deriveTagMemoAssociations(input, options = {})
```

## Input Contract

Allowed input:

- bounded seed memory id;
- bounded memory candidates;
- TagMemo tag projection;
- deterministic importance score;
- bounded query expansion hints;
- safe evidence hints.

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
associatedCandidates[]
associationScore
associationReasons[]
associationVersion: deterministic_v1
```

Rejected or empty candidate input must return low-disclosure output and must not echo forbidden values.

## Deterministic Signals

- Shared tags increase association score.
- Shared query expansion terms increase association score.
- Safe evidence hints for decision/proof/route/blocker increase association score.
- Importance score participates but does not dominate shared relevance.
- Duplicate association reasons are merged deterministically.
- Forbidden raw/private fields never enter `associationReasons`.

## Planned Tests

- Same input produces the same association ordering.
- Shared tags rank higher.
- Shared query expansion terms participate deterministically.
- Importance participates but does not dominate everything.
- Forbidden raw/private fields do not enter `associationReasons`.
- Empty candidate list returns low-disclosure output.
- Rejected candidate returns low-disclosure output.

## Regression Fixture

CM-1575 adds fixture/test coverage:

```text
tests/fixtures/tagmemo-association-recall-sprint-b-v1.json
tests/tagmemo-association-recall.test.js
```

The first regression slice locks fixture shape, required association scenarios, forbidden-value placement, side-effect boundaries, and the seven-tool public MCP surface before source implementation.

## Boundary Confirmation

```text
runtime integration: NOT_STARTED
association recall source implementation: NOT_STARTED
relation graph persistence: NOT_STARTED
live search: NOT_RUN
raw scan: NOT_RUN
broad memory scan: NOT_RUN
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
