# CM-1509 Audit Evidence Rollup Preflight

Status: `COMPLETED_VALIDATED_AUDIT_EVIDENCE_ROLLUP_PREFLIGHT_NO_READY_CLAIM`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Prepare the non-RC backlog hardening preflight for `audit evidence rollup`.

This packet defines the evidence rollup vocabulary, grouping rules, low-disclosure boundary, and future fixture/test acceptance criteria. It does not execute live client calls, provider/API calls, bearer-token paths, raw scans, effective `record_memory` writes, confirmed mutation, public MCP expansion, release/tag/deploy, or readiness / `RC_READY` claims.

## Rollup Scope

The rollup may summarize only bounded evidence already represented by committed docs, status entries, test summaries, or synthetic fixtures.

Allowed evidence sources for a future CM-1510 fixture/doc execution:

| Source class | Allowed content | Forbidden content |
|---|---|---|
| Committed evidence docs | Task id, validation id, evidence type, sanitized command name, pass/fail counts, explicit non-actions, blocker status | Raw audit rows, raw memory fields, provider payloads, bearer/token material, raw responses |
| Test fixtures | Synthetic evidence units with explicit low-disclosure fields | Real audit rows, real memory ids, filesystem paths, raw `.jsonl`, live transcripts |
| Status surfaces | Current status vocabulary and blocker state | Readiness overclaim, hidden blocker closure, raw/private data |
| Public contract summaries | Tool count and bounded output assertions | Public MCP expansion or schema mutation |

## Evidence Vocabulary

Future rollup output should classify evidence units using these labels:

| Label | Meaning |
|---|---|
| `docs-only` | Documentation or board/status evidence only; no runtime proof. |
| `fixture/test-only` | Synthetic fixture or local test coverage; no real memory or live client action. |
| `in-process proof` | Local in-process app/server proof without live client transport. |
| `live-runtime` | Actual runtime/client evidence; excluded unless separately approved. |
| `no-mutation` | Executed or inspected path produced no intended durable mutation. |
| `effective write` | A valid durable write occurred; excluded unless separately approved. |
| `blocked/deferred` | Evidence route remains open, deferred, or exact-approval-bound. |

CM-1509 defines vocabulary only. It does not reclassify prior evidence into readiness.

## Acceptance Criteria

Future CM-1510 fixture/doc work should prove:

| Criterion | Required result |
|---|---|
| Bounded evidence only | Rollup includes only sanitized task ids, validation ids, evidence labels, command summaries, result counts, and explicit non-actions. |
| No raw audit / broad scan | Rollup fixtures do not read or include raw audit rows, raw memory rows, raw `.jsonl`, SQLite/vector/cache content, or broad scan summaries. |
| No bearer/token/provider/API leakage | Rollup output does not include bearer, token, authorization, API key, provider URL, provider payload, model endpoint, or request header fields/values. |
| No raw private fields | Rollup output does not include memory ids, titles, content, snippets, file paths, source files, raw text, or identifiers from private records. |
| No write/mutation | Rollup creation does not trigger `record_memory`, durable audit append, controlled mutation, apply/confirm, or other write/mutation behavior. |
| Public surface unchanged | Public MCP surface remains the seven-tool contract by reference only; no public tool/schema expansion. |
| RC blockers preserved | Live client evidence and effective write reliability remain `OPEN / DEFERRED`; no readiness / `RC_READY` claim. |

## Fixture/Test Plan

Recommended future CM-1510 scope:

1. Add a synthetic rollup fixture containing mixed evidence units: docs-only, fixture/test-only, in-process proof, blocked/deferred, and explicitly excluded live/effective-write placeholders.
2. Add a rollup sanitizer/projection test or docs fixture test that asserts forbidden key/value families are absent.
3. Add grouping checks that separate `fixture/test-only` from `live-runtime`, and `no-mutation` from `effective write`.
4. Add status checks proving rollup does not close live client evidence or effective write reliability blockers.
5. Add a static public surface check only if a matching test entrypoint already exists; otherwise keep the surface assertion in docs for this backlog step.

If future fixture/test execution reveals a production source gap, record the finding and route source hardening to a separate task before editing production source.

## Forbidden Output Families

Future rollup tests should reject at least these field/value families:

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
api_key
bearer
bearerToken
token
authorization
requestHeaders
```

## Validation Matrix

| Validation | Scope | Required for CM-1509 |
|---|---|---|
| `CURRENT_FACTS.json` parse | machine snapshot integrity | yes |
| `git diff --check` | whitespace / patch hygiene | yes |
| `scripts\validate-local.ps1 -Area docs` | docs governance and board consistency | yes |
| staged diff check | commit hygiene | yes |
| changed-scope review | no readiness claim, RC blocker closure, live call, provider/API, bearer token, raw scan, effective write, confirmed mutation, public expansion, or release/tag/deploy drift | yes |

## Non-Actions

CM-1509 does not:

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
- release, tag, or deploy
- modify production source
- modify tests

## Next Route

Recommended next safe route:

```text
CM-1510 audit evidence rollup fixture/doc execution
```

CM-1510 should remain fixture/doc-first and should not promote rollup evidence into readiness.
