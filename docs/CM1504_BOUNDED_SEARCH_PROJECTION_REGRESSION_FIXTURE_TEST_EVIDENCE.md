# CM-1504 Bounded Search Projection Regression Fixture Test Evidence

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_BOUNDED_SEARCH_PROJECTION_REGRESSION_TEST_ONLY`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Execute the first fixture/test-only round for bounded search projection regression after CM-1503 activated the non-RC backlog hardening lane.

This is test-only hardening evidence. It is not live client evidence, runtime readiness evidence, effective write evidence, recall quality evidence, release evidence, or `RC_READY`.

## Changed Test Coverage

Updated:

```text
tests/search-memory-response-sanitizer.test.js
```

Added fixture-only assertions for:

- bounded projection rejects lifecycle and mutation status fields
- bounded projection rejects client boundary fields in result items
- public MCP tool surface remains exactly seven tools

## Regression Matrix

| Requirement | Evidence |
|---|---|
| Search projection does not return raw private fields | Existing sanitizer tests continue rejecting `content`, `text`, `snippet`, `raw_text`, paths, store metadata, memory ids, and title fields. |
| Bounded result does not leak lifecycle / mutation status | New fixture rejects `lifecycleStatus`, `mutationStatus`, `fromStatus`, `toStatus`, `newFromStatus`, `newToStatus`, `accepted`, and `decision` in bounded result items. |
| Rejected / filtered result remains low disclosure | Existing bounded evidence collector tests continue accepting safe empty/aggregate shapes and failing true access flags or result-item leaks. |
| Client boundary is not exposed as result data | New fixture rejects `clientId`, `client_id`, `actorClientId`, `workspaceId`, `projectId`, and `visibility` in bounded result items. |
| Public MCP tools count unchanged | New static test keeps public tools at exactly `record_memory`, `search_memory`, `memory_overview`, `audit_memory`, `validate_memory`, `tombstone_memory`, `supersede_memory`. |

## Validation

```powershell
node --test tests\search-memory-response-sanitizer.test.js
```

Result:

```text
tests: 12
pass: 12
fail: 0
```

Docs / board validation for this slice:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS.json parse ok')"
```

## Findings

No production source finding was opened in CM-1504. The fixture/test-only regression coverage passed against current source behavior.

If future review finds that production projection should reject additional result keys more explicitly rather than through the existing unknown-key fail-closed path, that should be handled as a separate source-hardening task.

## Boundaries

CM-1504 does not:

- execute live client calls
- call provider/API
- use bearer-token material
- perform raw scan
- perform an effective `record_memory` write
- execute confirmed mutation
- expand public MCP tools
- claim readiness or `RC_READY`
- close live client evidence blocker
- close effective write reliability blocker
- release, tag, or deploy

## Next Safe Route

```text
CM-1505 bounded search projection regression evidence audit or source-hardening decision
```

Recommended scope:

- audit whether CM-1504 test-only coverage is sufficient for the selected non-RC backlog item
- decide whether source-hardening follow-up is needed
- preserve RC blockers as open unless separately exact-approved and evidenced
