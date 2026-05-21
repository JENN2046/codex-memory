# CM-0606 Authorized Write-Path Auto-Authorization Widening Adoption Bridge

Status: DRAFT_LOCAL_RULE_NOT_EXECUTED
Decision: WIDENING_ADOPTION_BRIDGE_PREPARED_NOT_ADOPTED
Date: 2026-05-20

## Purpose

This note defines the missing bridge between:

- `CM-0605` escalation for future widening review
- any later explicit adoption decision that could allow automatic authorization to move beyond `CM-0601` reuse

It does not widen anything now.

It does not authorize `CM-0595` now.

It does not authorize `record_memory`.

Its purpose is only to predefine the future adoption record shape so the chain will not need to be redesigned after token presence is eventually proven.

## Why This Bridge Exists

`CM-0604` defines the future widening checklist.

`CM-0605` defines the current routing outcomes:

- no auto-approval
- auto-reuse `CM-0601` only
- escalate for future widening review

What neither note previously defined is:

```text
what exact docs/board decision would count as the later explicit widening adoption
```

This note fills that gap.

## Bridge Scope

This bridge is limited to one future adoption question only:

```text
May automatic authorization later widen from CM-0601-only reuse
to CM-0595 exactly-once write-validation issuance?
```

Nothing else is in scope.

## Required Inputs Before Any Future Adoption Record

Any future adoption record using this bridge would require all of the following:

1. `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md` still controls the mainline.
2. Controlling status still remains `RC_NOT_READY_BLOCKED`.
3. `docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md` still remains the accepted same-baseline endpoint/startup evidence.
4. A future same-baseline rebound execution has already succeeded and proven token presence.
5. `docs/CM-0604_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_WIDENING_GATE.md` is explicitly satisfied, not merely referenced.
6. `docs/CM-0605_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_DECISION_TABLE.md` has already routed the chain to:

```text
ESCALATE_FOR_FUTURE_WIDENING_REVIEW
```

7. No provider/config/startup-persistence/public-MCP-surface drift has appeared since the proving evidence.
8. No broad real-memory scan, `.jsonl` read, second write, or extra runtime side effect is required.

Without all eight, this bridge stays inactive.

## Future Adoption Record Shape

If a later operator wants to adopt widening, the record should explicitly answer all of these fields:

| field | required value |
|---|---|
| `mapAuthority` | `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md` |
| `controllingState` | `RC_NOT_READY_BLOCKED` |
| `sameBaselineEndpointStartupEvidence` | accepted and named |
| `sameBaselineTokenPresenceEvidence` | accepted and named |
| `cm0604Satisfied` | `true` |
| `cm0605RoutedOutcome` | `ESCALATE_FOR_FUTURE_WIDENING_REVIEW` |
| `writeUnitStillNarrowestNextProof` | explicit yes/no with justification |
| `futureAutoAuthorizationWideningAdopted` | explicit yes/no |
| `scopeStillLimitedToCm0595` | `true` |
| `forbiddenActionsStillForbidden` | explicit yes |

If any field is omitted or ambiguous, adoption should be treated as not granted.

## If Later Adopted

Even if a future adoption record later says widening is adopted, the widening remains narrow:

- only toward `CM-0595`
- only for one exactly-once sanitized public `record_memory` write validation
- still no `search_memory`
- still no marker search
- still no second write
- still no provider/model call
- still no config or `.env` edit
- still no watchdog/startup persistence
- still no public MCP expansion
- still no migration/import/export/backup/restore apply
- still no readiness claim

## Current State

As of now, this bridge remains inactive because:

- latest rebound evidence is still `CM-0603 = CURRENT_SESSION_TOKEN_STILL_MISSING`
- `CM-0605` has not yet routed any case to a successful token-present outcome
- `CM-0604` has not been satisfied by fresh same-baseline token-present evidence
- no later adoption decision exists

So the current conclusion remains:

```text
WIDENING_ADOPTION_NOT_GRANTED
RC_NOT_READY_BLOCKED
```

## Next Safe Action

Keep this note as the adoption-bridge layer only.

Use `CM-0605` for current routing.

Use `CM-0604` for future widening checklist review.

Only if a future rebound success later proves token presence on the same baseline should this bridge become relevant for an explicit widening-adoption record.
