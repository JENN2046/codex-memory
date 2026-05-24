# Memory Reliability Proof-Consumption Phase Handoff

Status: `MEMORY_RELIABILITY_PROOF_CONSUMPTION_HANDOFF_COMPLETED_NOT_READY`

Date: `2026-05-24`

Scope: `CM-0902` docs/board/status handoff only; no runtime execution and no reliability or readiness claim

## Purpose

`CM-0895` through `CM-0901` narrowed both reliability proof lanes:

- write reliability now has a fixed future proof-consumption seam, duplicate-basis rule, and `CM-0737` candidate rebind rule
- recall reliability now has a fixed future proof-consumption seam, `CM-0814` candidate rebind rule, internal-only interpretation, and query-family / baseline basis rule

This handoff records the combined phase state so future work does not accidentally treat guidance packets as execution approval or reliability closure.

## Current Write Proof Boundary

Future separately exact-approved live write proof, if ever chosen, must consume only this existing opt-in app seam:

```text
createCodexMemoryApplication()
-> enableWritePreflight=true
-> app.callTool('record_memory', ...)
```

It must also bind one exact duplicate basis before execution.

Acceptable basis families remain limited to:

- a prior accepted bounded canary basis, currently strongest as `CM-0737`
- a separately supplied exact operator basis
- a prebound canonical-hash basis

`CM-0737` is only a candidate-family anchor. It is not automatic authorization.

Future write proof must remain:

- exactly one `record_memory` call
- no broad `search_memory`
- no target-wide scan
- no two-write proof manufacture
- no provider/API call
- no raw durable memory or direct `.jsonl` read
- no public MCP expansion
- no default-on config change

## Current Recall Proof Boundary

Future separately exact-approved live recall proof, if ever chosen, must consume only this existing internal proof seam:

```text
TrueLiveRecallReadonlyProofRunner
-> createTrueLiveRecallExecutorAdapter({ app })
-> app.callTool('search_memory', ...)
```

It must preserve:

- `requestSource=internal-true-live-recall-readonly-proof-runner`
- `noTokenReadOnly=true`
- `noRawContentRead=true`
- `precisionPolicyContext.enabled=true`
- `proofNoResultMode=true`
- sanitized output only

It must also bind one exact query-family / baseline basis before execution.

Acceptable basis families remain limited to:

- a prior accepted bounded negative-control family, currently strongest as `CM-0814`
- a separately supplied exact operator query family
- a prebound canonical proof packet family

`CM-0814` is only a candidate-family anchor. It is not automatic authorization.

Future recall proof must not use:

- ad hoc query discovery
- direct public `search_memory`
- `dashboard`
- `governance-report`
- `http-observe`
- broad runtime exploration
- mixed historical slot inheritance

## Combined Interpretation

The current project state supports this conclusion:

- proof-consumption paths are now narrower and better documented
- both write and recall proof lanes remain exact-approved only
- candidate families are anchors only
- future baselines must be freshly rebound
- public MCP remains frozen at `record_memory`, `search_memory`, and `memory_overview`
- reliability remains unclaimed

This handoff does not close:

- `memory write reliable`
- `memory recall reliable`
- governance lifecycle closure
- runtime readiness
- RC readiness

## Next Safe Local Step

The next local step should depend on which phase is selected:

- For recall reliability: prepare one future exact approval packet only if a specific prebound query-family / baseline basis is explicitly selected.
- For write reliability: prepare one future exact approval packet only if a specific prebound duplicate basis is explicitly selected.
- For governance closure: continue internal-only lifecycle/scope/pollution-prevention work without public MCP expansion or durable live apply.

If no exact basis is selected, the correct state is to stay blocked rather than discover one through live exploration.

## Closeout

Result: `MEMORY_RELIABILITY_PROOF_CONSUMPTION_HANDOFF_COMPLETED_NOT_READY`.

`CM-0902` is docs/board/status handoff only. It performs no true live `record_memory`, no true live `search_memory`, no real memory scan, no raw memory read, no provider/API call, no durable memory/audit write, no public MCP expansion, no config/watchdog/startup change, no push/tag/release/deploy, and no readiness or reliability claim.
