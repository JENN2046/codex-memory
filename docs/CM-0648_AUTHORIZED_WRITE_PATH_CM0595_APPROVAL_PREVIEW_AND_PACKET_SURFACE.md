# CM-0648 Authorized Write-Path CM0595 Approval Preview And Packet Surface

Status: COMPLETED_VALIDATED
Decision: GOVERNANCE_ONLY_CM0595_PREVIEW_SURFACE_ADDED
Date: 2026-05-21

## Purpose

This note records the next aligned governance step after `CM-0647`.

`CM-0647` already let the widening-adoption path consume a real `CM-0607` adoption record and, with explicit `CM-0616 + CM-0607` input, reach:

```text
WIDENING_ADOPTION_GRANTED_CM0595_ONLY
```

But that result was still too implicit for operators.

This slice adds the missing future-`CM-0595` operator surfaces, so the same governance-only path now exposes:

- the exact future `CM-0595` approval line as structured preview data
- a future-`CM-0595` command-preview bundle
- a future-`CM-0595` operator-packet draft
- a rendered future-`CM-0595` operator-packet text surface

## What Changed

The widening-adoption evaluator now exposes:

- `cm0595ApprovalLinePreview`
- `cm0595CommandPreviewBundle`
- `cm0595OperatorPacketDraft`
- `renderedCm0595OperatorPacketTextSurface`

Those surfaces are carried through:

- `authorized-write-path-widening-adoption-review`
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
WIDENING_ADOPTION_NOT_READY
RC_NOT_READY_BLOCKED
```

With explicit `CM-0616 + CM-0607` fixture-backed input, the same governance path now reaches:

```text
WIDENING_ADOPTION_GRANTED_CM0595_ONLY
```

and also exposes:

- `cm0595ApprovalLinePreview.previewUsableNow = true`
- `cm0595CommandPreviewBundle.resolvedRecordPathMode = workspace_relative_pair`
- `cm0595OperatorPacketDraft.packetKind = cm0595_auto_authorization_operator_packet`

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
