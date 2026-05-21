# CM-0610 External Token-Material Assertion Contract

Status: CONTRACT_ONLY_NOT_EXECUTED
Decision: EXTERNAL_TOKEN_ASSERTION_CONTRACT_PREPARED
Date: 2026-05-20

## Purpose

This note defines the minimum docs/board contract for what counts as:

```text
an external token-availability change asserted outside the packet
```

for the current auto-authorization chain.

It does not prove token presence.

It does not issue approval.

It does not execute `CM-0601`.

It does not authorize `CM-0595`.

It does not authorize `record_memory`.

Its purpose is narrower:

- make `CM-0608` item `C6` auditable instead of relying on vague prose
- define which external token-change assertions are strong enough to justify a rebound recheck
- keep auto-authorization fail-closed when token state is only guessed, implied, or hand-waved

## Scope

This contract applies only to the current bounded unit:

```text
CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001
```

through:

```text
docs/CM-0601_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_PACKET.md
```

No other unit is in scope.

## What This Contract Does Not Do

This contract does not answer whether token material is actually present.

That proof still belongs to:

```text
CM-0601
```

This contract only defines whether a future operator may say:

```text
C6 = yes
```

in:

```text
docs/CM-0608_CM0601_AUTO_REUSE_PREFLIGHT_CHECKLIST.md
```

## Accepted Assertion Classes

Only these assertion classes may satisfy `C6`:

1. `OPERATOR_EXPLICIT_CURRENT_SESSION_ASSERTION`
2. `SEPARATE_SESSION_SETUP_STEP_RECORDED`
3. `EXTERNAL_HANDOFF_ASSERTION_RECORDED`

No other assertion class is accepted by default.

## Required Meaning For Any Accepted Assertion

Any accepted assertion must clearly mean all of the following:

1. token material was provided independently of the packet itself
2. the intended scope is the current session only
3. no binding, printing, or persistence is being requested by the assertion
4. the assertion is only meant to justify a presence-only rebound check
5. the assertion does not widen scope to `CM-0595`, `record_memory`, `search_memory`, provider calls, config mutation, startup persistence, public MCP expansion, durable write, or readiness claim

If any of those meanings are missing or ambiguous, the assertion fails closed.

## Minimum Record Shape

Any accepted assertion should be capturable in docs/board or in an operator message with these fields:

```text
assertionClass:
assertedCurrentSessionOnly:
assertedIndependentOfPacket:
assertedNoBindingRequested:
assertedNoPersistenceRequested:
assertedScopeStillCm0601Only:
assertedAt:
```

If the assertion cannot be restated in that shape, treat it as too weak.

## Accepted Examples

Examples that may satisfy `C6`, subject to the rest of `CM-0608`, include:

```text
token material has now been independently provided to the current session; only CM-0601-style presence recheck is requested
```

```text
a separate current-session setup step outside the packet has completed; do not bind or print the token, only recheck presence through CM-0601
```

```text
handoff record says current-session token material was independently injected outside the packet; next step remains CM-0601 presence-only rebound check
```

## Rejected Assertions

These are not strong enough for `C6`:

- `继续`
- `go ahead`
- `应该有了`
- `try again`
- `it might be there now`
- `I set something somewhere`
- any assertion that does not say current session
- any assertion that implicitly asks for binding, printing, persistence, startup, health probe, write validation, or write execution

These must all fail closed as:

```text
NO_AUTO_APPROVAL_ISSUED
```

## Link To Existing Chain

This contract sharpens:

- `docs/CM-0602_CURRENT_SESSION_TOKEN_REBOUND_AUTO_AUTHORIZATION_RULE.md`
- `docs/CM-0605_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_DECISION_TABLE.md`
- `docs/CM-0608_CM0601_AUTO_REUSE_PREFLIGHT_CHECKLIST.md`
- `docs/CM-0609_CM0601_AUTO_REUSE_EXECUTION_EVIDENCE_TEMPLATE.md`
- `docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md`

It does not replace them.

## Current State

As of now:

- no accepted external token-material assertion has been recorded
- latest rebound evidence is still token-missing
- `C6` therefore still fails

So the current result remains:

```text
NO_AUTO_APPROVAL_ISSUED
RC_NOT_READY_BLOCKED
```

## Next Safe Action

Use this contract the first next time an operator claims token material has independently entered the current session.

Only if the assertion satisfies this contract should `CM-0608` item `C6` be allowed to become `yes`.

If a ready-to-fill record is needed, use:

```text
docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md
```
