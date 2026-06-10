# V8 TagMemo Deep Recall Query Expansion Baseline

## Scope

This document prepares the bounded deterministic deep recall query expansion baseline for Sprint B.

The baseline is local, deterministic, fixture-backed, and internal-only. It is not live search, does not read raw memory, does not perform raw scans, does not call provider/API paths, does not write memory, does not persist tag enrichment, and does not expand public MCP tools.

## Sprint B Task Mapping

The user task book referred to this as Phase 1 / `CM-1560`. Repository reality already uses `CM-1560..CM-1569` for Sprint A. This Sprint B phase is recorded as `CM-1570` to preserve the committed evidence chain.

## Planned Module

```text
src/tagmemo/query-expansion.js
```

Planned exported function:

```text
expandTagMemoQuery(input, options = {})
```

## Input Contract

Allowed input:

- bounded query text;
- TagMemo tag projection;
- deterministic importance band or score;
- safe evidence hints;
- bounded recall intent.

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
expandedQueries[]
expansionReasons[]
expansionVersion: deterministic_v1
```

Rejected or empty input must return low-disclosure output and must not echo forbidden values.

## Deterministic Rules

- Keep the original bounded query as the first query.
- Add bounded tag-derived variants when tags match safe query intent.
- Add decision/proof/route/blocker synonyms from safe evidence hints only.
- Merge duplicate expansions deterministically.
- Bound expansion count and token-like length.
- Empty input returns a low-disclosure empty result.
- Rejected input returns a low-disclosure rejected result.

## Planned Tests

- Same input produces exactly the same output.
- Original bounded query is preserved first.
- Tag-derived expansion is deterministic and bounded.
- Evidence-derived expansion is deterministic and bounded.
- Duplicate expansions merge without blind multiplication.
- Forbidden raw/private fields do not enter output or reasons.
- Provider/API/token/raw shaped fields are rejected or stripped.
- Empty input is low-disclosure.

## Regression Fixture

CM-1571 adds fixture/test coverage:

```text
tests/fixtures/tagmemo-query-expansion-sprint-b-v1.json
tests/tagmemo-query-expansion.test.js
```

The first regression slice locks fixture shape, required expansion scenarios, forbidden-value placement, side-effect boundaries, and the seven-tool public MCP surface before source implementation.

## Source Implementation

CM-1572 adds the internal pure-function core:

```text
src/tagmemo/query-expansion.js
```

The implementation exports `expandTagMemoQuery(input, options = {})` and `EXPANSION_VERSION`.

Validation:

```text
tests\tagmemo-query-expansion.test.js: PASS_9_OF_9
```

The implementation is deterministic, local-only, and bounded. It does not call provider/API paths, does not perform live search, does not read raw memory, does not perform raw scans, does not persist tag enrichment, does not execute `record_memory`, and does not expand public MCP tools.

## Boundary Confirmation

```text
runtime integration: NOT_STARTED
query expansion source implementation: IMPLEMENTED_INTERNAL_PURE_FUNCTION
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
