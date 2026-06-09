# CM-1503 Non-RC Backlog Hardening Lane Activation

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_NON_RC_BACKLOG_LANE_ACTIVATED_NO_READY_CLAIM`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Activate a non-RC backlog hardening lane after the CM-1501 / CM-1502 RC blocker route freeze. Select the first safe backlog item and define execution boundaries.

Selected first backlog item:

```text
bounded search projection regression
```

This lane does not unfreeze RC readiness progression. It does not close the live client evidence blocker or the effective write reliability blocker.

## Lane Scope

```text
LANE: NON_RC_BACKLOG_HARDENING
FIRST_ITEM: BOUNDED_SEARCH_PROJECTION_REGRESSION
RC_READY: BLOCKED
LIVE_CLIENT_EVIDENCE_BLOCKER: OPEN / DEFERRED
EFFECTIVE_WRITE_RELIABILITY_BLOCKER: OPEN / DEFERRED
PUBLIC_MCP_SURFACE: FROZEN_NO_EXPANSION
```

Allowed future work in this lane is limited to docs, fixtures, test-only regression coverage, and static code hardening that preserves the existing public MCP surface.

## Acceptance Criteria

| Area | Acceptance criteria |
|---|---|
| Bounded projection shape | `include_content=false` bounded search projections stay free of raw content, memory ids, paths, titles, snippets, provider material, token material, and raw store metadata. |
| Negative shape checks | Empty or rejected bounded responses remain low-disclosure and do not imply readiness. |
| Positive shape checks | Non-empty bounded responses may expose only approved aggregate scoring / target fields and must not leak identity or content fields. |
| Wrapper handling | Evidence collectors must not infer leakage from safe wrapper keys such as `access.memoryIdsReturned=false`; they must inspect boolean values and result-item fields. |
| Public contract | No public MCP tool or schema expansion is allowed. |
| RC blockers | Live client evidence and effective write reliability blockers remain open and deferred. |

## Test Plan

Future implementation may add or adjust only read-only regression tests. Preferred entrypoints, if still current when selected:

- `tests/search-memory-response-sanitizer.test.js`
- `tests/http-no-token-search-rejection.test.js`
- a new focused test file only if existing files cannot host the fixture cleanly

Candidate assertions:

- bounded response with `include_content=false` rejects or strips `content`, `rawContent`, `snippet`, `path`, `memoryId`, `id`, and title-like identity fields from result items
- `access.memoryIdsReturned=false` is treated as a safe reporting flag, not as leakage
- `access.memoryIdsReturned=true` fails the evidence shape check
- result item `memoryId` / `id` / `path` / `snippet` fails the evidence shape check
- positive bounded result fixture remains scoped to approved aggregate scoring keys
- negative / rejected bounded result fixture remains low-disclosure

## Fixture Plan

Fixtures should be synthetic and in-memory only:

- no true live `search_memory`
- no real memory store reads
- no raw `.jsonl`, SQLite, vector, candidate-cache, or audit reads
- no bearer-token material
- no provider/API calls
- no effective `record_memory` write

Suggested fixture families:

| Fixture | Purpose |
|---|---|
| `bounded-empty-low-disclosure` | proves empty bounded projection has no raw/id/path/title/snippet fields |
| `bounded-positive-aggregate-only` | proves non-empty projection exposes only approved aggregate / target fields |
| `bounded-wrapper-safe-flags` | proves safe `access.*Returned=false` flags are not false positives |
| `bounded-leak-memory-id` | fail-closed case for result item memory id |
| `bounded-leak-content-path-title-snippet` | fail-closed case for raw or identifying fields |

## Existing Test-Only Hardening Plan

1. Inspect current sanitizer / projection tests.
2. Add the smallest fixture-only regression matrix.
3. Run the targeted Node test command for the touched test file.
4. Run docs validation and diff checks.
5. Keep results scoped as test-only hardening, not runtime, live-client, write, recall-quality, or RC readiness evidence.

## Boundaries

CM-1503 does not:

- claim readiness or `RC_READY`
- close the live client evidence blocker
- close the effective write reliability blocker
- execute live client calls
- perform an effective `record_memory` write
- call provider/API
- use bearer-token material
- perform raw scan
- execute confirmed mutation
- expand public MCP tools
- release, tag, or deploy

## Validation Matrix

| Validation | Scope | Required for CM-1503 |
|---|---|---|
| `CURRENT_FACTS.json` parse | machine snapshot integrity | yes |
| `git diff --check` | whitespace / patch hygiene | yes |
| `scripts\validate-local.ps1 -Area docs` | docs governance and board consistency | yes |
| targeted test command | only if tests are modified | not required for docs-only activation |
| staged diff check | commit hygiene | yes |
| changed-scope review | no blocker closure, readiness claim, live call, write, provider/API, bearer token, raw scan, confirmed mutation, public expansion, or release/tag/deploy | yes |

## Next Safe Route

```text
CM-1504 bounded search projection regression fixture/test plan execution
```

CM-1504, if selected, should remain fixture-only / test-only unless a future operator instruction explicitly changes scope.
