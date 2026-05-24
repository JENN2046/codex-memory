# Memory Lifecycle Scope Durable Governance Mutation Packet Contract

Status: `MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_MUTATION_PACKET_CONTRACT_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0861`

## Purpose

CM-0860 chose the durable governance mutation source-of-truth model:

- append-only governance mutation audit as canonical event trail;
- SQLite shadow metadata as current-state projection;
- revision/change-set emission as the bridge into recall invalidation.

CM-0861 turns that design into a fixture-only packet contract so later runtime work has one fail-closed packet shape to target.

This step still does not execute durable governance mutation, alter SQLite schema, append audit events, expand public MCP, or claim readiness/reliability.

## Delivered Surfaces

CM-0861 adds:

- `src/core/DurableGovernanceMutationPacketContract.js`
- `tests/fixtures/durable-governance-mutation-packet-v1.json`
- `tests/durable-governance-mutation-packet-fixture.test.js`
- `tests/durable-governance-mutation-packet-helper.test.js`

The helper accepts explicit input only and summarizes whether a proposed durable governance mutation packet remains safe for planning.

## Locked Packet Fields

The fixture now requires every durable governance mutation packet to specify at least:

- mutation family;
- exact target memory ids;
- exact scope tuple;
- actor client id and request source;
- reason and evidence summary;
- lifecycle transition;
- audit intent / audit commit policy;
- shadow projection policy;
- revision emitter;
- changed-memory-ids policy;
- rollback path;
- validation mode;
- explicit execution approval statement.

This is the minimum shape needed to keep the CM-0860 model auditable and compatible with the CM-0852..CM-0859 invalidation chain.

## Locked Mutation Families

The fixture currently locks five internal-only families:

- `memory_validate`
- `memory_supersede`
- `memory_tombstone`
- `memory_exclude`
- `memory_forget`

All five remain:

- `BLOCKED_PENDING_APPROVAL`
- internal-only
- non-public-MCP
- non-executed
- append-only-audit-required
- shadow-projection-required
- revision-emission-required
- changed-memory-ids-required

Per-family constraints are also locked:

- `memory_validate` remains single-target and aligned with the existing validate path.
- `memory_supersede` requires old/new ids plus bidirectional links.
- `memory_tombstone`, `memory_exclude`, and `memory_forget` remain logical, non-hard-delete flows.

## Explicit Non-Claims

CM-0861 does not prove or authorize:

- durable governance runtime apply;
- append-only audit writer implementation;
- shadow projection runtime implementation;
- SQLite schema apply;
- public MCP governance expansion;
- real memory governance preview;
- provider/config/startup action;
- push/tag/release/deploy;
- `memory write reliable`;
- `memory recall reliable`;
- `RC ready`;
- production readiness.

## Why This Matters

Before CM-0861, CM-0860 identified the right model but did not yet freeze the mutation packet boundary.

After CM-0861, the next runtime-facing slices can target one explicit packet contract instead of inventing fields ad hoc:

- CM-0862 can build a pure internal dry-run helper against this packet shape.
- CM-0863 can exercise temp-local or fixture-backed projection proof against the same packet semantics.
- CM-0864 can review runtime wiring against a fixed contract instead of a moving design target.

## Validation

Validated with:

- `node --check src\core\DurableGovernanceMutationPacketContract.js`
- `node --check tests\durable-governance-mutation-packet-fixture.test.js`
- `node --check tests\durable-governance-mutation-packet-helper.test.js`
- `node --test tests\durable-governance-mutation-packet-fixture.test.js`
- `node --test tests\durable-governance-mutation-packet-helper.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_MUTATION_PACKET_CONTRACT_COMPLETED_NOT_READY`

The durable governance mutation path now has a fixed fixture-only packet contract. Runtime mutation, SQLite projection apply, and live governance proof are still future work.
