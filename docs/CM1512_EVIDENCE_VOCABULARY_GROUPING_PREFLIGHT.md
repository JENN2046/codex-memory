# CM-1512 Evidence Vocabulary Grouping Preflight

Status: `COMPLETED_VALIDATED_EVIDENCE_VOCABULARY_GROUPING_PREFLIGHT_NO_READY_CLAIM`

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

`RC_READY` remains `BLOCKED`.

## Goal

Prepare the non-RC backlog hardening item `evidence vocabulary grouping` for fixture/test-only execution.

This preflight defines bounded evidence group names, allowed evidence families, forbidden evidence families, low-disclosure grouping rules, fixture/test plan, and acceptance criteria. It does not execute live client calls, provider/API calls, raw memory scans, raw audit scans, broad memory scans, effective `record_memory` writes, confirmed mutation, public MCP expansion, release/tag/deploy, or readiness work.

## Evidence Groups

| Group | Purpose | Allowed status shape |
|---|---|---|
| `public_contract_evidence` | Seven-tool public MCP contract proof and invalid-args rejection summaries | `completed` only for already-recorded bounded/in-process evidence |
| `readonly_audit_evidence` | `audit_memory` readonly / low-disclosure regression evidence | `completed` only for docs/test/fixture or bounded readonly proof |
| `bounded_search_projection_evidence` | Search projection sanitizer and bounded result regression evidence | `completed` only for fixture/static/test evidence |
| `audit_rollup_evidence` | Bounded audit evidence rollup fixture/doc evidence | `completed` only for bounded rollup evidence |
| `write_preflight_evidence` | Invalid-write, no-op, or dry-run write guard evidence | `planned`, `blocked`, or `completed` only when no effective write occurs |
| `deferred_rc_proof_evidence` | Live-client and effective-write RC proof items that remain deferred | `open_deferred`, never `completed` |
| `forbidden_or_unavailable_evidence` | Evidence families that must not enter bounded evidence | `forbidden`, `unavailable`, or `rejected` |

## Allowed Evidence Families

| Family | Allowed group | Boundary |
|---|---|---|
| `docs_only_receipt` | Any bounded docs group | Documentation-only evidence summaries |
| `fixture_test_evidence` | Bounded fixture/test groups | Synthetic fixture and local test evidence only |
| `in_process_bounded_proof` | `public_contract_evidence` or readonly audit evidence | Bounded proof already executed under prior approval and summarized without raw payloads |
| `no_mutation_bounded_proof` | Public/read-only evidence groups | Proof that records no intended mutation and no raw output |
| `invalid_args_rejection` | Public/write-preflight groups | Rejection evidence without effective write |
| `invalid_write_rejection` | `write_preflight_evidence` | Schema/guard rejection without durable write |
| `no_op_guard` | `write_preflight_evidence` | No-op guard evidence without durable write |
| `dry_run_guard` | `write_preflight_evidence` | Dry-run guard evidence without `dry_run=false` or `confirm=true` mutation |
| `blocked_deferred_proof` | `deferred_rc_proof_evidence` | RC proof that remains open/deferred |

## Forbidden Evidence Families

These families must be grouped only under `forbidden_or_unavailable_evidence` and must never be counted as bounded evidence:

```text
raw_audit
raw_memory_scan
broad_memory_scan
bearer_token
provider_api_payload
effective_write_payload
confirmed_mutation_payload
live_client_transcript_unredacted
```

## Low-Disclosure Grouping Rules

- Bounded groups must not contain raw private fields such as memory id, title, content, snippet, file path, raw audit, provider payload, authorization header, token, or bearer-like material.
- Forbidden evidence families must be preserved only as family labels and low-disclosure reasons, not as payloads.
- Deferred RC proof evidence must keep live client evidence and effective write reliability as `OPEN / DEFERRED`.
- A deferred proof must not be promoted to `completed`.
- Group summaries may include task ids, validation ids, group names, family names, and sanitized pass/fail status.
- Group summaries must not include raw audit rows, raw memory rows, broad scan output, live client unredacted transcript, provider/API payloads, or effective write payloads.
- Public MCP surface checks must remain exactly seven tools and must not add a new public tool.

## Fixture/Test Plan

Future CM-1513 may add:

- `tests/fixtures/evidence-vocabulary-grouping-*.json`
- `tests/evidence-vocabulary-grouping-fixture.test.js`

The fixture should include representative bounded evidence units, deferred RC proof units, and synthetic forbidden evidence units. The regression should prove:

- bounded evidence groups exclude raw/private fields;
- forbidden evidence maps only to `forbidden_or_unavailable_evidence`;
- deferred RC proof is never marked `completed`;
- live client evidence blocker remains `OPEN / DEFERRED`;
- effective write reliability blocker remains `OPEN / DEFERRED`;
- public MCP surface remains exactly seven tools.

## Acceptance Criteria

CM-1513 can be accepted only if:

- targeted fixture test passes;
- `git diff --check` passes;
- docs validation passes;
- `.agent_board/CURRENT_FACTS.json` parses;
- staged diff check passes;
- no forbidden boundary is crossed;
- no RC blocker is closed;
- no readiness / `RC_READY` claim is made.

## Non-Actions

CM-1512 does not execute live client calls, provider/API calls, bearer-token use, raw memory scans, raw audit scans, broad memory scans, effective `record_memory` writes, confirmed mutation, `dry_run=false` mutation, `confirm=true` mutation, public MCP expansion, release/tag/deploy, RC blocker closure, or readiness / `RC_READY` claim.

## Next Route

`CM-1513 evidence vocabulary grouping fixture/test execution`
