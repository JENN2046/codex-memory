# CM-0628 Authorized Write-Path Operator Command Preview Surface

Status: COMPLETED_VALIDATED_NOT_READY
Decision: OPERATOR_COMMAND_PREVIEW_EXPOSED_READ_ONLY
Date: 2026-05-21

## Purpose

`CM-0627` already carried the current bundle and next artifact into normal text surfaces.

One operator gap still remained:

- operators could see the current bundle
- operators could see the next artifact
- but they still had to remember or reconstruct which read-only command to run next

`CM-0628` closes only that gap.

It adds one stage-aware, read-only command-preview surface:

```text
commandPreviewBundle
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

The evaluator and normal read-only control surfaces now expose:

- a command-preview bundle kind
- a primary recommended read-only command id
- the primary recommended command itself
- the helper/control-surface command family for the same future assertion-record path

Current command families cover only governance-only review paths such as:

- `authorized-write-path-auto-authorization`
- `governance-report`
- `dashboard`
- `http-observe`

## Current Runtime Truth

Default truth remains unchanged:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentBlockedOn = external_token_assertion_not_accepted
artifactBundleDraft.bundleKind = assertion_record_only
commandPreviewBundle.bundleKind = assertion_record_command_bundle
commandPreviewBundle.primaryCommandId = helper_assertion_record_review
```

So the new command-preview surface is available now, but it still only previews blocked governance review paths until explicit future input changes the governing result.

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
2. reuse the previewed helper/control-surface commands instead of reconstructing them
3. evaluate the chain through the existing governance-only paths
4. decide whether the chain stays blocked, reuses `CM-0601`, or escalates into widening review

Until then, keep `RC_NOT_READY_BLOCKED`.
