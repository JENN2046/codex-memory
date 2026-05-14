# P15.5 Real Memory Query Dry-Run Plan

## Purpose

P15.5 plans a future real local memory query dry-run surface.

This phase is planning only. It does not implement a CLI, does not read real local memory, does not call providers, does not write durable memory, and does not change query runtime behavior.

The future dry-run should help answer a narrow question: if an operator explicitly opts in, can codex-memory produce a redacted, low-risk query quality preview against local memory without mutation, provider calls, migration, import/export apply, or public MCP expansion?

## Current Baseline

The current P15 baseline remains fixture-first:

- `real-query-suite` fixture recall dry-run: `14/14`
- `query:quality` fixture recall dry-run: `14/14`
- `gate:ci` standing signal: `checks.queries.detail.fixtureRecallDryRun`
- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`

P15.5 does not replace the fixture gate. A future real-memory dry-run would be an opt-in diagnostic, not a default CI gate.

## Proposed Future Surface

A future real-memory query dry-run may be a local CLI only, for example:

```powershell
npm run query:quality:real-dry-run -- --json --query "<redacted-query>" --limit 5 --redact
```

This command does not exist in P15.5. The example is a planning placeholder for future review.

The future surface should report only low-risk summary fields:

- `status`
- `mode=real-memory-dry-run`
- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`
- `redactionApplied=true`
- `queryRedacted=true`
- `resultCount`
- `candidateCount`
- `scopePolicyApplied`
- `lifecyclePolicyApplied`
- `rawWorkspaceIdExposed=false`
- `rawSecretExposed=false`
- `requiresExplicitApproval=true`

## Required Boundaries

Any future implementation must be:

- read-only
- local-only
- opt-in
- redacted by default
- no provider
- no daemon requirement
- no durable memory write
- no audit-log write unless separately approved
- no SQLite migration
- no import/export apply
- no broad memory export
- no public MCP tool expansion
- no `validate_memory` mutation surface expansion

## Redaction Rules

A future dry-run must not output:

- raw memory content by default
- raw secrets or secret-like strings
- raw `workspace_id`
- raw private client identifiers
- raw database paths that reveal sensitive local structure
- authorization headers, cookies, provider keys, or `.env` values

Allowed output should prefer:

- counts
- booleans
- status labels
- redacted snippets only if explicitly approved
- stable hashes or opaque refs only when they cannot reconstruct sensitive content

## Approval Boundary

P15.5 does not authorize any real memory read preview.

Before any future real-memory dry-run implementation, an explicit approval packet should define:

- exact command name
- allowed files
- redaction behavior
- whether raw snippets are forbidden or allowed
- maximum result count
- whether audit-log read is allowed
- whether SQLite read is allowed
- validation commands
- rollback story
- safe-push behavior

Without that approval, future work should continue with fixtures and docs only.

## Failure And Stop Conditions

Future implementation must stop if it requires:

- provider smoke or benchmark
- real memory mutation
- SQLite migration or `ALTER TABLE`
- import/export apply
- broad real memory export
- public MCP schema/tool changes
- `.env` or secret edits
- package or lockfile changes
- runtime ranking changes

Query quality findings must not be fixed by weakening fixture assertions or inventing synthetic `hitRate` / `qualityScore`.

## Validation Plan For This Planning Phase

P15.5 docs-only validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

No query CLI, provider command, migration, import/export command, or real-memory scan is required for P15.5.

## Future Sequence

Recommended next steps after P15.5:

1. `P15.6-query-quality-closeout-review`
   - Summarize P15.1-P15.5 evidence, boundaries, and remaining risks.
2. `P16-TagMemo-semantic-association-parity-planning`
   - Start with planning only after P15 closeout.

Do not jump directly to P16 implementation, provider benchmark, V8, UI, migration apply, import/export apply, or release candidate.

## Next Recommended Phase

`P15.6-query-quality-closeout-review`
