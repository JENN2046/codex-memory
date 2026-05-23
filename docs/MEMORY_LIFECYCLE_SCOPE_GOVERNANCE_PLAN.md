# Memory Lifecycle Scope Governance Plan

Status: `MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_PLAN_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0843`

## Purpose

This plan defines the first governance-closure layer after the write reliability evidence ladder reached `CM-0842`.

It connects non-destructive bad-write remediation to the long-term objective:

- memory proposal / approval;
- supersession;
- tombstone;
- forget / exclusion flow;
- user / project / agent / task / client / workspace scope;
- prevention of bad, stale, rejected, superseded, tombstoned, or out-of-scope memory polluting normal recall.

This is a plan only. It does not execute true live `record_memory`, true live `search_memory`, real memory scan, raw memory read, direct `.jsonl` or durable memory content read, provider/API call, durable memory/audit write, cleanup apply, rollback apply, migration/import/export/backup/restore apply, public MCP expansion, package/config/watchdog/startup change, push, release, deploy, cutover, or readiness/reliability claim.

## Current Evidence Inputs

- `CM-0836` fixture-only lifecycle/dedup/suppression preflight helper proves explicit-input duplicate/scope/lifecycle preflight decisions.
- `CM-0838` integrates that preflight as a default-disabled internal runtime gate.
- `CM-0839` accepts that integration as bounded internal runtime evidence.
- `CM-0840` classifies accepted-write rollback cleanup as partial and non-atomic.
- `CM-0842` proves fixture-only rollback/cleanup accounting and confirms non-destructive remediation still needs lifecycle/governance semantics.

## Governance Model

| concept | meaning | default recall effect | approval boundary |
|---|---|---|---|
| proposal | Candidate memory not yet durable-normalized for recall. | Not recalled by default. | May be created only by explicit proposal path; durable write still requires approval. |
| approval | Decision that a proposed memory may enter active recall scope. | Active only inside allowed scope. | Must record approver/source and exact scope. |
| supersession | Newer memory replaces or narrows older memory. | Superseded memory is excluded from normal recall unless explicitly requested for audit/history. | Requires exact target memory id and reason. |
| tombstone | Record is marked inactive because it is wrong, unsafe, stale, or should not influence recall. | Tombstoned memory is excluded from normal recall. | Requires exact target memory id and reason. |
| forget / exclusion | Record is excluded from recall and, if later approved, may be physically cleaned according to hard-gated policy. | Forgotten/excluded memory is not recalled by default. | Logical exclusion can be bounded; physical deletion remains hard-gated. |
| correction / compensating record | Append-only governance record that explains a bad write without rewriting audit. | Correction may affect recall ranking/suppression; raw old record remains auditable. | Requires exact target and non-destructive reason. |

## Scope Model

Each lifecycle decision must bind to an explicit scope tuple where available:

```text
user_id
project_id
workspace_id
client_id
agent_id
task_id
conversation_id
folder
visibility
retention_policy
```

Scope rules:

1. Project/workspace/client/task scope should be resolved from runtime context before payload fields.
2. Payload scope drift must fail closed unless explicitly approved and explained.
3. User-private or agent-private scope must not leak into project/global recall by default.
4. Task-scoped process memory should not become durable cross-task knowledge without promotion approval.
5. Folder / LightMemo directory semantics must stay compatible with existing recall filters.
6. Missing scope must be treated as less trusted than exact matching scope.

## Recall Pollution Prevention Rules

Normal recall should exclude these by default:

- rejected writes;
- preflight-rejected writes;
- proposal-only memories;
- superseded memories;
- tombstoned memories;
- forgotten/excluded memories;
- stale memories flagged beyond policy;
- memories outside the current user/project/agent/task/client/workspace scope;
- memories with unresolved bad-write remediation state;
- memories whose scope metadata is malformed or ambiguous.

Audit/history views may expose sanitized metadata for these records, but normal recall should not silently use them as active evidence.

## Evidence Ladder

| step | target | allowed implementation surface | proof required |
|---|---|---|---|
| 1 | Fixture lifecycle/scope contract | Pure helper or fixture-only test. | Proposal/approval/supersession/tombstone/forget decisions are fail-closed and scope-bound. |
| 2 | Runtime preflight review | Existing default-disabled CM-0838 gate plus injected candidates. | Lifecycle actions require exact approval and cannot be smuggled through payload-only fields. |
| 3 | Read-policy fixture evidence | Recall pipeline fixture or candidate-filter helper. | Inactive/out-of-scope records are suppressed from normal recall while audit metadata remains explainable. |
| 4 | Temp-local lifecycle evidence | Isolated temp root and synthetic records only. | Lifecycle state persists in temp-local projection without real memory reads/writes. |
| 5 | Controlled live approval packet | Exact approval packet only. | Future live proof can run only after fixture/temp-local governance evidence is reviewed. |

## Candidate Implementation Scope

Future implementation should prefer the smallest internal surface:

- a pure lifecycle/scope decision helper in `src/core/*`;
- targeted fixture tests in `tests/*lifecycle*scope*governance*.test.js`;
- optional runtime integration only behind existing internal preflight paths;
- no public MCP schema expansion;
- no direct `.jsonl` read;
- no provider/API requirement;
- no default physical deletion.

## Pass Criteria For Future Evidence

Future evidence can pass only if it proves:

- proposal records do not enter active recall without approval;
- approved records carry exact scope;
- superseded records are suppressed from normal recall;
- tombstoned records are suppressed from normal recall;
- forget/exclusion records are suppressed from normal recall;
- scope mismatches fail closed;
- malformed lifecycle or scope metadata fails closed;
- correction records are append-only and non-destructive;
- no raw private content is required to inspect governance state;
- physical cleanup remains hard-gated unless separately exact-approved.

## Non-Claims

This plan does not claim:

- lifecycle governance implemented;
- scope governance implemented;
- memory recall reliable;
- memory write reliable;
- real cleanup safety;
- real rollback safety;
- runtime readiness;
- RC readiness;
- production readiness;
- V8 implementation;
- VCP full parity.

`RC_NOT_READY_BLOCKED` remains the controlling state.
