# P41 Evidence Manifest Contract

Status: synthetic fixture contract only.

P41-T2 defines a local evidence manifest shape for P41-P45. It is a contract for explicit caller-provided evidence metadata. It does not collect evidence, scan files, run commands, start services, read real memory, inspect runtime stores, call providers, mutate durable state, expand public MCP, or claim readiness.

## Safe Source Types

The contract accepts only allowlisted local evidence source types:

- `committed_fixture`
- `committed_test`
- `committed_doc`
- `local_validation_summary`
- `synthetic_fixture`
- `sanitized_metadata`
- `explicit_input`

Unsupported source types fail closed. Real memory scans, diary scans, SQLite scans, vector index scans, candidate cache scans, recall audit scans, provider calls, config switches, public MCP expansion, migration apply, backup/restore, and remote actions are blocked sources.

## Critical Gate Semantics

Critical gate states are fail-closed:

- `failed`
- `skipped`
- `unknown`
- `warning_only`
- `missing`
- `ambiguous`
- `unparsable`
- `unsupported_source`

Only explicit pass evidence may be accepted as local evidence posture, and that posture still does not mean runtime readiness.

## Non-Goals

P41-T2 does not:

- implement the evidence reader/helper
- implement runtime policy enforcement
- execute a final RC matrix runner
- read fixtures implicitly
- scan real memory or runtime stores
- mutate memory or audit logs
- expand public MCP tools or schemas
- call providers or models
- authorize push, tag, release, deploy, config switch, or watchdog install
