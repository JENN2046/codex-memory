# Memory Lifecycle Scope Durable Governance Shadow Projection Proof

Status: `MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_SHADOW_PROJECTION_PROOF_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0863`

## Purpose

CM-0861 locked the packet contract.

CM-0862 added a fail-closed dry-run preview.

CM-0863 adds the next smallest step above those two layers:

- still explicit-input only;
- still internal-only;
- still zero-side-effect;
- but now able to preview how a bounded durable governance mutation would project onto current shadow-state metadata for selected lifecycle families.

This step still does not execute durable governance mutation, append audit events, apply SQLite writes, expand public MCP, or claim readiness/reliability.

## Delivered Surfaces

CM-0863 adds:

- `src/core/DurableGovernanceShadowProjectionPreview.js`
- `tests/fixtures/durable-governance-shadow-projection-records-v1.json`
- `tests/durable-governance-shadow-projection-preview.test.js`

The helper consumes:

- one CM-0861/CM-0862-compatible dry-run packet candidate;
- one explicit synthetic current-projection record set.

It returns a fail-closed shadow projection preview instead of performing any mutation.

## Current Supported Projection Families

CM-0863 intentionally stays narrow.

It currently previews only:

- `memory_supersede`
- `memory_tombstone`

Everything else remains fail-closed for projection preview.

## What The Helper Proves

For the bounded supported families, the helper now proves in fixture-backed form:

- dry-run preview must already be accepted;
- projection family must be explicitly supported;
- required current projection records must exist;
- current lifecycle state must be allowed for the family;
- exact scope tuple must match the synthetic current projection records;
- family-specific link semantics must be coherent.

For accepted previews, it now emits:

- affected records;
- before/after projected lifecycle fields;
- changed-memory-id preview;
- deterministic projected revision token;
- blocking findings list when anything drifts.

## Supersede Projection Semantics

The current bounded supersede preview proves this shadow projection shape:

- old record `status -> superseded`
- old record `supersededBy -> newMemoryId`
- new record `supersedes -> oldMemoryId`
- replacement record becomes `active`
- lifecycle updated-at / actor fields are previewed, not applied

This aligns with the existing controlled-write planning semantics without pretending runtime supersede is already implemented.

## Tombstone Projection Semantics

The current bounded tombstone preview proves this shadow projection shape:

- target record `status -> tombstoned`
- `tombstoneReason` is preserved in projected metadata
- lifecycle updated-at / actor fields are previewed, not applied

This remains logical/non-destructive only.

## Data Exposure Posture

CM-0863 keeps the same strict no-side-effect posture:

- no implicit file reads after explicit input is loaded;
- no command execution;
- no service start;
- no durable state mutation;
- no provider calls;
- no raw scope-id leakage in preview output;
- no raw actor token leakage in normalized preview input/output.

Scope verification still happens internally for correctness, but preview output only keeps redacted scope-id values.

## Explicit Non-Claims

CM-0863 does not prove or authorize:

- durable governance runtime apply;
- append-only audit writer runtime implementation;
- SQLite projection apply;
- temp-local live projection apply;
- public MCP governance expansion;
- true live governance mutation;
- `memory write reliable`;
- `memory recall reliable`;
- `RC ready`;
- production readiness.

## Why This Matters

Before CM-0863, the project knew:

- what the mutation packet should look like;
- and how to block/fail-close a dry-run preview;
- but not yet how selected mutation families should project onto current shadow-state metadata.

After CM-0863, there is now one bounded proof surface for current-state projection semantics, which makes future runtime wiring much less speculative.

That means the next step can be narrower and more concrete:

- either a temp-local projection proof if we want one more non-runtime evidence layer;
- or a runtime-candidate review that targets a fixed packet + dry-run + projection-preview stack.

## Validation

Validated with:

- `node --check src\core\DurableGovernanceShadowProjectionPreview.js`
- `node --check tests\durable-governance-shadow-projection-preview.test.js`
- `node --test tests\durable-governance-shadow-projection-preview.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_SHADOW_PROJECTION_PROOF_COMPLETED_NOT_READY`

The durable governance mutation path now has a bounded shadow projection proof surface for `memory_supersede` and `memory_tombstone`, but runtime mutation, durable audit/projection apply, and live governance proof remain future work.
