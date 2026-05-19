# Phase F Memory Governance Proposal Draft Refresh

Status: `DESIGN_DRAFT_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `8c2c5d8`

## Purpose

Refresh the local-safe Phase F memory governance proposal draft. This document defines proposal, supersession, tombstone, and forget-flow concepts as a design boundary only. It does not implement runtime behavior, write durable memory, append audit records, run governance reports, migrate data, or claim readiness.

## Scope Boundary

Allowed in this slice:

- describe future memory governance concepts
- define local-safe review states
- define fixture/test-only acceptance ideas for a later slice
- record hard-stop boundaries for durable writes and real-store operations

Not allowed in this slice:

- durable memory writes
- durable audit writes
- real memory broad scans
- provider calls
- recall observation
- migration/import/export/backup/restore apply
- public MCP expansion
- config/watchdog/startup changes
- push, tag, release, deploy, or cutover
- readiness claims

## Proposed Governance Objects

| Object | Purpose | Future Evidence Type | Hard Stop Boundary |
|---|---|---|---|
| `memory_proposal` | Candidate memory change that has not yet mutated durable stores. | local JSON/Markdown proposal | durable write requires exact approval |
| `supersession_record` | Explains why one memory item should replace or narrow another. | proposal plus review note | applying supersession requires exact approval |
| `tombstone_record` | Marks a memory item as intentionally hidden or retired. | proposal plus safety rationale | durable tombstone write requires exact approval |
| `forget_request` | Requests removal or suppression of user/project memory. | approval packet plus audit boundary | destructive deletion requires exact approval |
| `governance_review` | Human/agent review result for a proposal. | local review note or fixture | cannot be treated as execution authority |

## Proposed Local States

```text
DRAFT_NOT_APPROVED
REVIEW_READY_NOT_APPROVED
APPROVED_FOR_EXACT_ACTION
APPLIED_WITH_AUDIT
REJECTED
SUPERSEDED
TOMBSTONED
FORGET_REQUESTED
FORGET_APPLIED_WITH_AUDIT
```

Default state for local design and fixture work is `DRAFT_NOT_APPROVED`.

## Safety Rules

- A proposal is not a durable memory write.
- A review note is not approval unless it names the exact action, subject, scope, and allowed command path.
- Supersession should preserve auditability and should not silently erase history.
- Tombstone should hide or retire by policy before any destructive deletion is considered.
- Forget flow must separate preview, approval, apply, audit, and verification.
- Real stores must not be scanned broadly without explicit approval.
- Public MCP tools remain frozen unless a dedicated approved phase changes that boundary.

## Future Fixture/Test Ideas

A later fixture-only slice may add:

```text
tests/fixtures/phase-f-memory-governance-proposal-v1.json
tests/phase-f-memory-governance-proposal-fixture.test.js
```

Suggested fixture assertions:

- default state is `DRAFT_NOT_APPROVED`
- proposal/review/tombstone/forget objects are syntactically distinct
- durable mutation flags are false in proposal-only records
- exact approval fields are required before any apply state
- destructive deletion is never represented as default behavior
- public MCP tools remain frozen to `record_memory`, `search_memory`, and `memory_overview`
- readiness and approval-overclaim wording is forbidden

## Relationship to Existing Runtime

This draft does not change existing governance/report runtime behavior. It only sketches a future local-safe acceptance shape that can be compared against current project docs and tests later.

## Next Safe Task

```text
CM-0538 Phase F memory governance proposal fixture plan
```

Expected scope:

- synthetic fixture/test plan only
- no durable writes
- no real-store reads
- no runtime source change unless separately planned

## Result

The project remains `NOT_READY_BLOCKED`.
