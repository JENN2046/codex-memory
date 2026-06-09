# CM-1515 Search Quality Evaluation Preflight

Status: `COMPLETED_VALIDATED_SEARCH_QUALITY_EVALUATION_PREFLIGHT_NO_READY_CLAIM`

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

`RC_READY` remains `BLOCKED`.

## Goal

Prepare the non-RC backlog item `search quality evaluation` for fixture/test-only execution.

This is not live search, not raw memory scan, and not broad memory scan. The scope is limited to fixture/static/bounded projection quality checks.

## Fixture Plan

Future CM-1516 may add:

- `tests/fixtures/search-quality-evaluation-*.json`
- `tests/search-quality-evaluation-fixture.test.js`

The fixture should include:

- bounded query intent metadata;
- bounded search result candidates with sanitized scores and ranking features;
- filtered/private result candidates that project to low-disclosure rejection;
- synthetic client-boundary mismatch candidates;
- synthetic adversarial values that must not appear in the projected result;
- expected public MCP tool list with exactly seven tools.

## Bounded Search Result Quality Criteria

Allowed result fields:

- `resultId` fixture-local id;
- `target`;
- `score`;
- bounded ranking metadata such as `baseScore`, `rerankScore`, `matchCount`, `tagHitCount`, `recencyBucket`, and `reasonCodes`;
- low-disclosure status fields such as `accepted`, `filtered`, and `reasonCode`.

Forbidden result fields:

- raw memory id;
- title;
- content;
- snippet;
- source file;
- path;
- raw text;
- raw audit;
- provider/API payload;
- bearer/token/authorization-shaped material;
- lifecycle or mutation status;
- client id or cross-client private fields.

## Ranking / Filtering Criteria

| Case | Expected handling |
|---|---|
| bounded public fixture result | May be accepted with bounded score and ranking metadata |
| filtered/private fixture result | Must return low-disclosure filtered status |
| client boundary mismatch | Must be rejected or low-disclosure filtered |
| ranking metadata | Must not reveal raw/private source fields |
| unavailable evidence | Must not trigger live DB or broad scan fallback |

## Low-Disclosure Criteria

- Filtered results must not echo sensitive fixture values.
- Private/cross-client candidates must not expose raw target existence, lifecycle metadata, or private client identifiers.
- Rejection paths may expose only bounded reason codes.
- Ranking explanations must be aggregate or code-based, not raw-text based.

## Public Surface Criterion

Public MCP surface must remain exactly seven tools:

```text
record_memory
search_memory
memory_overview
audit_memory
validate_memory
tombstone_memory
supersede_memory
```

## Acceptance Criteria

CM-1516 can be accepted only if:

- targeted fixture test passes;
- bounded search results do not leak raw private fields;
- filtered/private results are low-disclosure;
- client boundary is not bypassed;
- ranking fixture does not require live DB;
- no raw memory scan or broad memory scan is executed;
- public MCP surface remains exactly seven tools;
- docs validation and staged diff check pass;
- no RC blocker is closed;
- no readiness / `RC_READY` claim is made.

## Non-Actions

CM-1515 does not execute live search, live client calls, provider/API calls, bearer-token use, raw memory scans, raw audit scans, broad memory scans, effective `record_memory` writes, confirmed mutation, public MCP expansion, release/tag/deploy, RC blocker closure, or readiness / `RC_READY` claim.

## Next Route

`CM-1516 search quality evaluation fixture/test execution`
