# Memory Lifecycle Scope Deferred Family Re-entry Contract

Date: `2026-05-24`
Status: `COMPLETED_VALIDATED_LOCAL_COMMIT_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`
Current commit task: `CM-0986`
Original candidate lineage: `CM-0927`

## Purpose

Record the smallest machine-checkable guard for the two lifecycle families that are still deferred after the internal runtime-entry family stabilized on `validate + tombstone + supersede`.

Deferred families:

- `memory_exclude`
- `memory_forget`

This slice adds a pure explicit-input helper only:

- [DeferredGovernanceFamilyReentryContract.js](/A:/codex-memory/src/core/DeferredGovernanceFamilyReentryContract.js)
- [deferred-governance-family-reentry-contract.test.js](/A:/codex-memory/tests/deferred-governance-family-reentry-contract.test.js)

The helper does not read files, run commands, start services, call providers, scan real memory, mutate durable state, expose raw private data, add MCP tools, or claim readiness.

## Contract Meaning

The helper separates two concepts:

- `acceptedForGovernanceReview`: the input is safe to review as a local governance contract.
- `readyForInternalReentryReview`: the deferred families have enough exact evidence to consider a future internal runtime-entry review, still without execution.

The default current-state fixture satisfies only the first concept. Later policy/helper packets may provide some prerequisite evidence, but this contract still requires exact explicit input before reporting `readyForInternalReentryReview=true`.

`memory_exclude` and `memory_forget` are still not ready for internal re-entry because they do not yet have:

- internal service implementation
- bounded runtime-prep seam
- internal runtime-entry surface
- approved-context gate evidence
- append-only audit plan
- shadow projection policy
- changed-memory-ids policy
- scope/pollution read-policy evidence
- candidate-cache invalidation policy
- no-hard-delete default
- exact execution approval requirement
- public MCP freeze evidence for the family

## Fail-closed Rules

The contract rejects or refuses readiness when:

- either deferred family is missing
- any unexpected family is substituted
- public MCP expansion is claimed
- execution approval is claimed
- runtime integration is claimed
- durable mutation is claimed
- hard delete is allowed by default
- provider calls are reported
- real memory scan is reported
- readiness is claimed
- side-effect safety flags are not all clear
- public tools differ from `record_memory`, `search_memory`, and `memory_overview`

## Boundary

This contract does not:

- implement `memory_exclude`
- implement `memory_forget`
- add public MCP tools
- widen `callTool()`
- change `TOOL_DEFINITIONS`
- execute true live memory actions
- apply durable governance mutation
- append durable audit events
- read real memory or `.jsonl`
- call providers or external APIs
- change package, config, watchdog, or startup state
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC_READY`

## Validation

Targeted validation for this slice:

```powershell
node --check .\src\core\DeferredGovernanceFamilyReentryContract.js
node --check .\tests\deferred-governance-family-reentry-contract.test.js
node --test .\tests\deferred-governance-family-reentry-contract.test.js
```

Expected result: current deferred state is accepted for safe governance review but remains `readyForInternalReentryReview=false`.

CM-0986 reran this narrow gate before local commit consideration.

## Next Safe Step

Keep `memory_exclude` and `memory_forget` deferred until a future exact local slice supplies the missing evidence without public MCP expansion, destructive deletion, real memory scan, provider call, config/startup change, or readiness claim.
