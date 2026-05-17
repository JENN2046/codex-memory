# P36 Scope And A5 Boundary Contract

Status: fixture-only / dry-run-only planning contract.

P36 starts the boundary-first governed memory spine. It is not a runtime policy kernel, not a migration preview, not a recall rewrite, and not readiness for mainline cutover.

## Contract

- Unknown, missing, ambiguous, or unparsable governance metadata fails closed.
- Unknown risk labels map to `A5-hard-stop`.
- Public MCP tools remain frozen: `record_memory`, `search_memory`, `memory_overview`.
- Governance records, validation transcripts, redaction samples, and policy decisions must not enter normal user recall namespaces.
- Dry-run means synthetic fixtures or sanitized metadata only. It does not authorize touching real memory content.
- Critical gate skipped or unknown equals failure.
- Readiness means local evidence report only, not operational cutover.

## Scope Metadata

P36 requires fixture contracts to name these metadata dimensions before future policy decisions can be accepted:

- `client`
- `project`
- `workspace`
- `memory_kind`
- `governance_record_kind`
- `source`

No dimension may silently default to global scope.

## A5 Hard Stops

The following remain blocked unless separately and explicitly approved:

- real memory content read, preview, export, import, or scan
- SQLite migration apply
- backup or restore
- provider or model call
- public MCP tool or schema expansion
- `.env` or secret edit
- watchdog install, startup install, or config switch
- dependency change
- durable memory or audit write
- push, tag, release, or deploy

## Evidence

The committed fixture contract is [p36-scope-a5-boundary-contract-v1.json](/A:/codex-memory/tests/fixtures/p36-scope-a5-boundary-contract-v1.json).

The focused test is [p36-scope-a5-boundary-contract-fixture.test.js](/A:/codex-memory/tests/p36-scope-a5-boundary-contract-fixture.test.js).

## Non-Goals

P36-T1 does not:

- implement a runtime policy kernel
- execute a policy gate
- read real memory content
- write durable memory or audit state
- alter recall ranking, candidate cache, vector index, or diary paths
- expand public MCP tools or schemas
- claim v1.0 RC or runtime readiness
