# CM-0651 Authorized Write-Path CM0595 Record Draft Surfaces

Status: COMPLETED_VALIDATED
Decision: GOVERNANCE_ONLY_CM0595_RECORD_DRAFT_SURFACES_ADDED
Date: 2026-05-21

## Purpose

This note records the next aligned governance step after `CM-0648`.

`CM-0648` already exposed the future `CM-0595` exact approval line, review commands, packet draft, and rendered packet text once explicit `CM-0616 + CM-0607` input grants:

```text
WIDENING_ADOPTION_GRANTED_CM0595_ONLY
```

But the future chain still lacked the two artifacts that would actually make that later auto-authorization auditable:

- the issuance record for the exact `CM-0595` line
- the later execution evidence for that exact write-validation unit

This slice adds those missing future-record draft surfaces.

## What Changed

The widening-adoption evaluator now also exposes:

- `cm0595IssuanceRecordDraft`
- `cm0595ExecutionEvidenceDraft`

Those surfaces point to:

- `docs/CM-0649_AUTHORIZED_WRITE_PATH_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md`
- `docs/CM-0650_AUTHORIZED_WRITE_PATH_CM0595_EXECUTION_EVIDENCE_TEMPLATE.md`

and are carried through:

- `authorized-write-path-widening-adoption-review`
- `governance-report`
- `dashboard`
- `http-observe`

The rendered future `CM-0595` packet now also includes a `Next Record Drafts` section so operators can review the exact next artifacts without leaving the same governance packet.

## Validated Result

Default real state remains:

```text
WIDENING_ADOPTION_NOT_READY
RC_NOT_READY_BLOCKED
```

With explicit `CM-0616 + CM-0607` fixture-backed input, the same governance path now reaches:

```text
WIDENING_ADOPTION_GRANTED_CM0595_ONLY
```

and additionally exposes:

- `cm0595IssuanceRecordDraft.draftUsableNow = true`
- `cm0595ExecutionEvidenceDraft.draftUsableNow = true`
- `renderedCm0595OperatorPacketTextSurface` with `## Next Record Drafts`

while still keeping:

```text
canExecuteRuntimeNow = false
```

## Boundaries Preserved

This change does not:

- prove current-session token presence
- issue runtime approval
- execute `CM-0595`
- execute `record_memory`
- widen beyond the narrow future `CM-0595` boundary

The controlling state remains:

```text
RC_NOT_READY_BLOCKED
```

## Next

The next real move is still external, not local code-only:

1. token material must independently exist in the current session
2. the chain must still route through the same same-baseline evidence path
3. only then can the future narrow `CM-0595` question become live
