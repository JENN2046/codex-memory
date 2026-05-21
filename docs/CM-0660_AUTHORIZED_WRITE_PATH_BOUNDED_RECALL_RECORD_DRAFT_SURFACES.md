# CM-0660 Authorized Write-Path Bounded Recall Record Draft Surfaces

Status: COMPLETED_VALIDATED
Decision: GOVERNANCE_ONLY_BOUNDED_RECALL_RECORD_DRAFT_SURFACES_ADDED
Date: 2026-05-21

## Purpose

This note records the next aligned governance step after `CM-0657`.

`CM-0657` already exposed the future bounded-recall exact-approval review commands, packet payload, and rendered command preview.

But the future bounded-recall chain still lacked the two later artifacts that would make that preparation boundary auditable:

- the issuance record for the exact bounded-recall approval-preparation line
- the later execution evidence for that same preparation unit

This slice adds those missing future-record draft surfaces.

## What Changed

The bounded-recall preparation evaluator now also exposes:

- `boundedRecallApprovalIssuanceRecordDraft`
- `boundedRecallExecutionEvidenceDraft`

Those surfaces point to:

- `docs/CM-0658_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md`
- `docs/CM-0659_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE.md`

and are carried through:

- `authorized-write-path-bounded-recall-preparation-review`
- `governance-report`
- `dashboard`
- `http-observe`

The rendered bounded-recall text now also includes a `Next Record Drafts` section.

## Validated Result

Default real state remains:

```text
BOUNDED_RECALL_APPROVAL_NOT_READY
RC_NOT_READY_BLOCKED
```

With explicit later `CM-0607 + CM-0649 + CM-0650` fixture-backed input, the same governance path now reaches:

```text
BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY
```

and additionally exposes:

- `boundedRecallApprovalIssuanceRecordDraft.draftUsableNow = true`
- `boundedRecallExecutionEvidenceDraft.draftUsableNow = true`
- rendered bounded-recall text with `## Next Record Drafts`

while still keeping:

```text
canExecuteBoundedRecallNow = false
canExecuteRuntimeNow = false
```

## Boundaries Preserved

This change does not:

- prove current-session token presence
- issue runtime approval
- execute bounded recall
- execute `search_memory`
- execute `record_memory`

The controlling state remains:

```text
RC_NOT_READY_BLOCKED
```
