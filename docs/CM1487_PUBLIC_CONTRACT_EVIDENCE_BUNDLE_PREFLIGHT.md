# CM-1487 Public Contract Evidence Bundle Preflight

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_PUBLIC_CONTRACT_EVIDENCE_BUNDLE_PREFLIGHT_NO_LIVE_CALLS`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Prepare the preflight plan for a seven-tool public contract evidence bundle after controlled mutation public surface closeout.

This is docs preflight only. It does not execute live MCP `tools/list` or `tools/call`, does not fix source, does not expand the public MCP surface, does not execute confirmed mutation, does not use `dry_run=false`, does not use `confirm=true`, does not perform raw scan, does not call provider/API, does not use bearer token material, and does not claim readiness or `RC_READY`.

## Evidence Bundle Purpose

The future evidence bundle should collect and classify evidence for the current seven-tool public contract without turning stale, docs-only, or no-mutation evidence into readiness.

The bundle should answer:

- Which public tools are expected.
- Which evidence exists for each tool.
- Which evidence is current after controlled mutation public surface closeout.
- Which evidence is stale, docs-only, source/test-only, or no-mutation.
- Which future exact bounded proof would be required before any live/integration claim.

## Expected `tools/list` Contract

Future evidence should expect exactly these seven public tools:

| Tool | Expected status | Evidence class needed |
|---|---|---|
| `record_memory` | public | existing contract/source/test evidence, plus evidence-age classification |
| `search_memory` | public | existing contract/source/test evidence, plus evidence-age classification |
| `memory_overview` | public | existing contract/source/test evidence, plus evidence-age classification |
| `audit_memory` | public readonly bounded | public readonly contract evidence and low-disclosure evidence |
| `validate_memory` | public controlled mutation dry-run only | low-disclosure public dry-run evidence; no confirmed mutation |
| `tombstone_memory` | public controlled mutation dry-run only | low-disclosure public dry-run evidence; no confirmed mutation |
| `supersede_memory` | public controlled mutation dry-run only | low-disclosure public dry-run evidence; no confirmed mutation |

Expected `tools/list` negative assertions for a future exact proof:

- no eighth public tool
- no private/admin/raw/debug provider tool
- no schema field that authorizes `dry_run=false`
- no schema field that authorizes `confirm=true`
- no new public MCP expansion
- no bearer-token material in output
- no provider/API configuration in output
- no raw path, raw audit, raw memory, raw SQLite, raw JSONL, raw vector, or raw cache disclosure

CM-1487 does not run `tools/list`; it only defines these expectations.

## Expected `tools/call` Low-Disclosure Assertions

Future evidence should classify expected `tools/call` behavior by tool class.

| Tool class | Tools | Expected public call assertion |
|---|---|---|
| existing memory tools | `record_memory`, `search_memory`, `memory_overview` | Evidence should use existing bounded public contract records and classify whether any live proof is stale. CM-1487 does not execute calls. |
| readonly audit tool | `audit_memory` | Evidence should confirm readonly bounded low-disclosure behavior from existing source/test and any approved no-mutation proof. Raw audit or raw store output must remain absent. |
| controlled mutation dry-run tools | `validate_memory`, `tombstone_memory`, `supersede_memory` | Evidence should confirm public projection stays low-disclosure: `accepted` is not true, `decision` is not `dry-run`, lifecycle transition metadata is absent, and confirmed mutation remains blocked. |

Expected controlled mutation dry-run negative assertions for future evidence:

- no `accepted=true`
- no `decision=dry-run`
- no `fromStatus`
- no `toStatus`
- no `newFromStatus`
- no `newToStatus`
- no target existence or eligibility disclosure
- no private/cross-client disclosure
- no durable mutation
- no raw memory/audit/store disclosure
- no provider/API call
- no bearer-token material use
- no readiness or `RC_READY` claim

Expected fail-closed assertions for future evidence:

- `dry_run=false` remains rejected on public path
- `confirm=true` remains rejected on public path
- confirmed mutation requires separate exact approval
- future exact proof must not execute mutation while gathering public contract evidence

CM-1487 does not run `tools/call`; it only defines these expectations.

## Evidence Checklist Design

Future bundle rows should use this shape:

| Field | Meaning |
|---|---|
| `tool` | one of the seven expected public tools |
| `expected_public_status` | public / public readonly / public dry-run only |
| `evidence_source` | file, test, doc, commit, or future exact proof packet |
| `evidence_type` | docs-only / source-test / no-mutation / post-push source audit / stale live / future exact bounded proof required |
| `current_after_closeout` | yes / no / unknown |
| `low_disclosure_assertions` | relevant output redaction or low-disclosure properties |
| `forbidden_boundary_check` | no live call, no raw scan, no provider/API, no bearer token, no mutation, no readiness claim |
| `remaining_gap` | what remains open without claiming it closed |

## Existing Evidence To Classify Later

The future bundle should classify at least:

- CM-1483 controlled mutation public surface closeout receipt.
- CM-1482 post-push source audit for public dry-run low-disclosure hardening.
- CM-1481 source/test hardening for uniform low-disclosure public dry-run.
- CM-1479 actor binding and privacy gate hardening.
- CM-1473 in-process no-mutation public controlled mutation proof.
- CM-1472 public registration and strict gate evidence.
- CM-1461 `audit_memory` public readonly registration evidence.
- older live client evidence as stale or pre-closeout when applicable.

CM-1487 does not inspect raw stores or run live calls to refresh this evidence.

## Validation Matrix

| Validation | Purpose | Required for CM-1487 |
|---|---|---|
| `git diff --check` | whitespace and patch hygiene | Yes |
| `scripts\validate-local.ps1 -Area docs` | docs governance and board consistency | Yes |
| `CURRENT_FACTS.json` parse | machine snapshot integrity | Yes |
| staged diff check | commit hygiene | Yes |
| changed-scope review | ensure no live-call, source-fix, expansion, mutation, raw/provider/bearer, or readiness drift | Yes |

## Future Exact Proof Boundary

Any later live evidence collection must require a separate exact approval packet that names:

- exact transport and endpoint
- exact authentication boundary, if any
- exact allowed `tools/list` count
- exact allowed `tools/call` count
- exact tools and arguments
- expected sanitized output keys
- forbidden output keys
- stop conditions
- rollback or cleanup expectation

CM-1487 does not grant that approval.

## Explicit Non-Claims

CM-1487 does not:

- execute live MCP `tools/list`
- execute live MCP `tools/call`
- fix source
- expand public MCP tools
- execute confirmed mutation
- use `dry_run=false`
- use `confirm=true`
- perform raw scan
- call provider/API
- use bearer token material
- claim readiness or `RC_READY`
