# CM-0657 Authorized Write-Path Bounded Recall Approval Preview And Command Surface

Status: COMPLETED_VALIDATED
Decision: GOVERNANCE_ONLY_BOUNDED_RECALL_PREVIEW_SURFACE_ADDED
Date: 2026-05-21

## Purpose

This note records the next aligned governance step after `CM-0656`.

`CM-0655` already exposed the future bounded-recall exact approval line as preview data.

`CM-0656` already carried the bounded-recall preparation result into the normal read-only operator surfaces.

But the future bounded-recall exact-approval review path still lacked one reusable command family.

This slice adds that missing surface, so the same governance-only path now exposes:

- the future bounded-recall exact approval line as structured preview data
- a bounded-recall command-preview bundle
- the same command bundle inside the bounded-recall operator packet draft
- the same command preview inside rendered bounded-recall text

## What Changed

The bounded-recall preparation evaluator now exposes:

- `boundedRecallApprovalLinePreview`
- `boundedRecallCommandPreviewBundle`
- `boundedRecallOperatorPacketDraft.commandPreviewBundle`
- rendered bounded-recall text with `## Command Preview`

Those surfaces are carried through:

- `authorized-write-path-bounded-recall-preparation-review`
- `governance-report`
- `dashboard`
- `http-observe`

They stay:

- explicit-input
- read-only
- fail-closed
- governance-only

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

and also exposes:

- `boundedRecallCommandPreviewBundle.bundleKind = bounded_recall_exact_approval_review_command_bundle`
- `boundedRecallCommandPreviewBundle.resolvedRecordPathMode = workspace_relative_triple`
- `boundedRecallOperatorPacketDraft.commandPreviewBundle.bundleKind = bounded_recall_exact_approval_review_command_bundle`

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
- execute `CM-0595`
- execute `record_memory`

The controlling state remains:

```text
RC_NOT_READY_BLOCKED
```

## Next

The next real move is still external, not local code-only:

1. token material must independently exist in the current session
2. the same-baseline chain must still pass through `CM-0601`, `CM-0605`, `CM-0604`, `CM-0616`, `CM-0607`, `CM-0654`, and `CM-0655`
3. only then can a future exact bounded-recall approval question become live
