# CM-0611 External Token-Material Assertion Record Template

Status: TEMPLATE_ONLY_NOT_EXECUTED
Decision: EXTERNAL_TOKEN_ASSERTION_RECORD_TEMPLATE_PREPARED
Date: 2026-05-20

## Purpose

This note prewrites the record shape that should be used when a future operator claims token material has independently entered the current session.

It does not prove token presence.

It does not issue approval.

It does not execute `CM-0601`.

It does not authorize `CM-0595`.

It does not authorize `record_memory`.

Its purpose is narrower:

- avoid ad hoc wording when evaluating `CM-0608` item `C6`
- make `CM-0610` usable as a fill-in record instead of only a contract
- keep future external token assertions machine-reviewable and fail-closed

## Scope

This template applies only to the current bounded unit:

```text
CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001
```

and only for the external assertion layer described in:

```text
docs/CM-0610_EXTERNAL_TOKEN_MATERIAL_ASSERTION_CONTRACT.md
```

No other unit is in scope.

## When To Use

Use this template only when someone is explicitly claiming:

```text
token material has independently entered the current session
```

and the next intended action is still only:

```text
CM-0601 presence-only rebound check
```

Do not use this template for:

- proving token presence
- recording `CM-0601` execution
- recording `CM-0595` discussion
- startup/health/write/recall/provider/config actions

## Required Fields

Fill all of these fields:

```text
Status:
Decision:
Date:
Assertion source:
assertionClass:
assertedCurrentSessionOnly:
assertedIndependentOfPacket:
assertedNoBindingRequested:
assertedNoPersistenceRequested:
assertedScopeStillCm0601Only:
assertedNoStartupHealthWriteRecallRequested:
assertedAt:
Contract verdict:
Next allowed use:
```

## Allowed Decision Values

Only these decision values are allowed:

```text
EXTERNAL_TOKEN_ASSERTION_ACCEPTED_FOR_C6_REVIEW
EXTERNAL_TOKEN_ASSERTION_REJECTED_FAIL_CLOSED
EXTERNAL_TOKEN_ASSERTION_INSUFFICIENT_EVIDENCE
```

## Template Body

Use this body shape when the future assertion occurs:

```text
Status: <fill>
Decision: <fill>
Date: <fill>
Assertion source: <fill>
assertionClass: <fill from CM-0610 accepted classes or rejected class>
assertedCurrentSessionOnly: <yes/no>
assertedIndependentOfPacket: <yes/no>
assertedNoBindingRequested: <yes/no>
assertedNoPersistenceRequested: <yes/no>
assertedScopeStillCm0601Only: <yes/no>
assertedNoStartupHealthWriteRecallRequested: <yes/no>
assertedAt: <fill>
Contract verdict: <accepted/rejected/insufficient>
Next allowed use: <fill>

## Assertion Summary

- Claimed change: `<fill>`
- Intended next action still limited to `CM-0601`: `<yes/no>`

## CM-0610 Field Check

- accepted assertion class: `<fill>`
- current-session-only meaning present: `<yes/no>`
- independent-of-packet meaning present: `<yes/no>`
- no binding requested: `<yes/no>`
- no persistence requested: `<yes/no>`
- no widening to `CM-0595` or runtime mutation: `<yes/no>`

## Verdict

- If accepted: this record may be used only to support `CM-0608/C6=yes`.
- If rejected or insufficient: keep `CM-0608/C6=no`.

## Still Forbidden

- no token binding
- no token print
- no token persistence
- no `start:http:ensure`
- no `/health` probe
- no `record_memory`
- no `search_memory`
- no marker search
- no `.jsonl` read
- no provider call
- no config or `.env` edit
- no watchdog/startup persistence
- no public MCP expansion
- no durable write
- no readiness claim
```

## Current State

As of now:

- no accepted external token-material assertion has been recorded
- latest rebound evidence is still token-missing
- this template is preparation only

So the chain remains:

```text
RC_NOT_READY_BLOCKED
```

## Next Safe Action

If a future operator claims token material has independently entered the current session:

1. fill this template first
2. evaluate it against `CM-0610`
3. only then decide whether `CM-0608/C6` may become `yes`
