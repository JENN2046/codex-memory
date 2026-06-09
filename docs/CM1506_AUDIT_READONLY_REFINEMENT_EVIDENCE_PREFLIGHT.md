# CM-1506 Audit Readonly Refinement Evidence Preflight

Status: `COMPLETED_VALIDATED_AUDIT_READONLY_REFINEMENT_PREFLIGHT_NO_READY_CLAIM`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Prepare the first non-RC backlog hardening preflight for `audit readonly refinements`.

This packet establishes the docs / fixture / test boundary for proving that `audit_memory` remains readonly, bounded, and low-disclosure. It does not execute a live client call, provider/API call, bearer-token path, raw scan, effective `record_memory` write, confirmed mutation, public MCP expansion, release/tag/deploy, or readiness / `RC_READY` claim.

## Existing Surface Review

Reviewed current source and tests by direct file inspection only:

| Surface | Current evidence | CM-1506 interpretation |
|---|---|---|
| `src/core/AuditMemoryReadonlyService.js` | Builds `audit_memory_readonly_bounded` access policy with raw memory, raw audit, path, token, provider payload, memory id, title, snippet, and content flags set false. | Existing production service is already shaped as a bounded projection surface. |
| `FORBIDDEN_OUTPUT_KEYS` / `ensureNoForbiddenOutputKeys(...)` | Recursively rejects forbidden output keys including memory ids, titles, content, snippets, paths, raw audit/text/jsonl, provider URL, token, and authorization. | Existing sanitizer hook is the correct test target for leakage regressions. |
| `tests/audit-memory-readonly-service.test.js` | Covers default bounded empty projection, safe aggregate decisions, raw/unbounded rejection, mutation-like input rejection, no provider fetch, no DB-like mutation, and recursive forbidden key guard. | Existing test entrypoint can host CM-1507 fixture-only regression extensions. |
| `tests/audit-memory-public-contract-preflight.test.js` | Covers public registration, MCP `tools/list`, `app.callTool('audit_memory')`, MCP `tools/call` bounded projection, schema rejection for raw and mutation-like inputs, and readonly low-disclosure semantics. | Existing public-contract test entrypoint can host public surface count and bounded output assertions. |
| `docs/CM1497_AUDIT_SEARCH_WRITE_GOVERNANCE_BLOCKER_CLASSIFICATION.md` | Classifies `audit_memory` readonly bounded policy refinements as post-RC backlog, with raw audit and public expansion deferred. | CM-1506 stays in non-RC backlog lane and does not close RC blockers. |
| `docs/CM1505_BOUNDED_SEARCH_PROJECTION_REGRESSION_CLOSEOUT_AND_NEXT_BACKLOG_SELECTION.md` | Selects `audit readonly refinements` as the next backlog item and lists expected no-leakage criteria. | CM-1506 converts that selection into a concrete fixture/test preflight. |

No raw audit rows, raw memory rows, raw `.jsonl`, raw SQLite/vector/cache data, provider payloads, bearer-token material, or live client transcripts were read or executed for this preflight.

## Acceptance Criteria

Future CM-1507 fixture/test execution should prove:

| Criterion | Required result |
|---|---|
| `audit_memory` readonly behavior | No write, mutation, durable audit append, effective `record_memory`, confirmed mutation, or apply path is triggered. |
| Raw/private output suppression | Output contains no raw private fields, memory ids, titles, content, snippets, paths, raw audit rows, raw text, raw JSONL, provider URL/payload, bearer, token, or authorization material. |
| Bounded evidence summary | Evidence uses only bounded projection fields such as access flags, summary counts, requested audit family, window, policy booleans, and sanitized finding fields. |
| Raw and mutation-like input handling | `include_raw=true`, out-of-bound window, raw audit family, and mutation-like keys fail closed. |
| Provider/API isolation | Fixture tests must prove no provider/API or `fetch` path is called. |
| Public surface stability | Public MCP tools remain exactly the post-closeout seven-tool contract; no new public tool or schema expansion is introduced. |
| RC blocker isolation | Live client evidence and effective write reliability blockers remain `OPEN / DEFERRED`; no readiness / `RC_READY` claim is made. |

## Fixture/Test Plan

Preferred CM-1507 scope:

1. Extend `tests/audit-memory-readonly-service.test.js` with fixture-only leakage regression coverage for a broader forbidden-key set, including bearer/token/provider/API-shaped fields and nested raw/private fields.
2. Extend `tests/audit-memory-public-contract-preflight.test.js` only if needed to assert the public MCP surface remains seven tools and public `audit_memory` bounded output does not expose lifecycle/private/provider/token material.
3. Keep fixtures synthetic and explicit-input only. Do not connect to real audit stores, real memory stores, raw `.jsonl`, SQLite/vector/cache data, provider services, or live MCP clients.
4. If the fixture test reveals a production source gap, record the finding and route to a separate `CM-1508 audit readonly refinement source hardening` slice before changing production code.

Candidate no-leakage keys for future tests:

```text
memoryId
memory_id
title
content
snippet
filePath
relativePath
sourceFile
path
rawText
raw_text
rawJsonl
rawAudit
providerUrl
providerURL
providerPayload
apiKey
bearer
bearerToken
token
authorization
```

## Validation Matrix

| Check | Required for CM-1506 | Result |
|---|---:|---|
| `CURRENT_FACTS.json` parse | yes | recorded in CMV-1611 |
| `git diff --check` | yes | recorded in CMV-1611 |
| `scripts\validate-local.ps1 -Area docs` | yes | recorded in CMV-1611 |
| staged diff check | yes | recorded in CMV-1611 |
| changed-scope review | yes | no source/test/runtime/live/write/public-expansion drift |
| audit targeted tests | no, because CM-1506 is docs/board/status only | defer to CM-1507 if tests change |

## Non-Actions

CM-1506 does not:

- claim readiness or `RC_READY`
- close live client evidence RC blocker
- close effective write reliability RC blocker
- execute a live client call
- call provider/API
- use bearer-token material
- perform raw scan
- execute an effective `record_memory` write
- execute confirmed mutation
- expand public MCP tools
- release/tag/deploy
- modify production source
- modify tests

## Next Route

Recommended next safe route:

```text
CM-1507 audit readonly refinements fixture/test execution
```

CM-1507 should remain fixture/test-only unless it records a source finding and routes source hardening to a separate task.
