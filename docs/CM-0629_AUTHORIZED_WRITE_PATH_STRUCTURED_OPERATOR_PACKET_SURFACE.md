# CM-0629 Authorized Write-Path Structured Operator Packet Surface

Status: COMPLETED_VALIDATED_NOT_READY
Decision: STRUCTURED_OPERATOR_PACKET_EXPOSED_READ_ONLY
Date: 2026-05-21

## Purpose

`CM-0628` already exposed the next recommended read-only commands as `commandPreviewBundle`.

One automation-facing gap still remained:

- current bundle state was available
- next command family was available
- approval/record previews were available
- but future operators or automation still had to reassemble those fields into one current-stage packet

`CM-0629` closes only that gap.

It exposes one stage-aware, governance-only packet:

```text
operatorPacketDraft
```

## Scope

This work remains governance-only and fail-closed.

It does not:

- prove token presence
- issue approval
- execute `CM-0601`
- widen to `CM-0595`
- call `record_memory`
- touch runtime/config/provider state

## Result

The evaluator and normal read-only control surfaces now expose one current-stage packet that groups:

- current `artifactBundleDraft`
- current `commandPreviewBundle`
- current-stage approval/record previews when relevant
- current-stage record drafts when relevant

Current packet kinds are stage-aware:

- `assertion_record_operator_packet`
- `assertion_contract_operator_packet`
- `cm0601_reuse_operator_packet`
- `widening_review_operator_packet`

So future operators or automation no longer need to cross-read several governance fields before deciding what the current packet actually is.

## Current Runtime Truth

Default truth remains unchanged:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentBlockedOn = external_token_assertion_not_accepted
artifactBundleDraft.bundleKind = assertion_record_only
commandPreviewBundle.bundleKind = assertion_record_command_bundle
operatorPacketDraft.packetKind = assertion_record_operator_packet
```

So the new packet surface is available now, but it still only packages blocked governance artifacts until explicit future input changes the governing result.

## Validation

Validated with:

- targeted helper / CLI / control-surface tests
- full `npm test`
- `git diff --check`
- local docs validation

## Next Safe Action

Wait for token material to independently exist in the current session.

After that, future operators can:

1. record the external assertion with `CM-0611`
2. feed that record into the existing governance-only evaluation path
3. read one current `operatorPacketDraft` instead of reassembling bundle/command/preview fields by hand
4. decide whether the chain stays blocked, reuses `CM-0601`, or escalates into widening review

Until then, keep `RC_NOT_READY_BLOCKED`.
