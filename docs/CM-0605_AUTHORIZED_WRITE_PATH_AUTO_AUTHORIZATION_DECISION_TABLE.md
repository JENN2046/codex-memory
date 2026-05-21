# CM-0605 Authorized Write-Path Auto-Authorization Decision Table

Status: DRAFT_LOCAL_RULE_NOT_EXECUTED
Decision: AUTO_AUTHORIZATION_DECISION_TABLE_PREPARED_NOT_ADOPTED
Date: 2026-05-20

## Purpose

This note turns the current auto-authorization governance preparation into a deterministic decision table.

It does not authorize runtime execution by itself.

It does not widen automatic authorization to `CM-0595`.

It does not authorize `record_memory`.

Its role is narrower:

- make the current auto-authorization ceiling machine-readable at the docs/board level
- define the only governance outputs that are currently allowed
- show exactly when the chain must stay blocked, may auto-reuse `CM-0601`, or must escalate for future widening review

## Controlling Inputs

This decision table is subordinate to:

- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `docs/CM-0602_CURRENT_SESSION_TOKEN_REBOUND_AUTO_AUTHORIZATION_RULE.md`
- `docs/CM-0604_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_WIDENING_GATE.md`
- `docs/CM-0595_AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_PACKET.md`
- `docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md`
- `docs/CM-0603_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_EXECUTION_EVIDENCE.md`

If any of those disagree with this note, the controlling docs above win.

## Current Allowed Governance Outputs

Today this chain allows only these governance outputs:

1. `NO_AUTO_APPROVAL_ISSUED`
2. `AUTO_REUSE_CM0601_LINE_ONLY`
3. `ESCALATE_FOR_FUTURE_WIDENING_REVIEW`

No current output in this note auto-authorizes `CM-0595`.

## Decision Table

| case | external token-availability change asserted per CM-0610? | CM-0602 preconditions still hold? | latest same-baseline rebound result | CM-0604 satisfied? | CM-0604 explicitly adopted for widening? | allowed governance output | effect |
|---|---|---|---|---|---|---|---|
| 1 | no | n/a | `CM-0603 = CURRENT_SESSION_TOKEN_STILL_MISSING` or no newer success evidence | n/a | no | `NO_AUTO_APPROVAL_ISSUED` | Stay `RC_NOT_READY_BLOCKED`; do not consume another rebound packet. |
| 2 | yes | no | any | n/a | no | `NO_AUTO_APPROVAL_ISSUED` | Stay blocked on drift, scope change, or missing prerequisites. |
| 3 | yes | yes | last controlling evidence still token-missing or stale for current token state | no | no | `AUTO_REUSE_CM0601_LINE_ONLY` | The only allowed auto-issued text is the exact `CM-0601` approval line. |
| 4 | yes | yes | future rebound execution still ends token-missing | no | no | `NO_AUTO_APPROVAL_ISSUED` | Stay `RC_NOT_READY_BLOCKED`; `CM-0595` remains blocked. |
| 5 | yes | yes | future rebound execution proves token present on same baseline | no | no | `ESCALATE_FOR_FUTURE_WIDENING_REVIEW` | Token blocker may be cleared, but `CM-0595` still remains separate exact approval. |
| 6 | yes | yes | future rebound execution proves token present on same baseline | yes | no | `ESCALATE_FOR_FUTURE_WIDENING_REVIEW` | Widening checklist is satisfied, but adoption still has not occurred. |
| 7 | yes | yes | future rebound execution proves token present on same baseline | yes | yes | `ESCALATE_FOR_FUTURE_WIDENING_REVIEW` | This note still does not itself widen to `CM-0595`; a later governing rule would be required to do that. |

## Interpretation Notes

- Case 3 is the current ceiling of automatic authorization.
- Cases 5 through 7 are intentionally conservative.
- Even if token presence is later proven, the chain does not jump straight from no-write proof to bounded durable-write proof.
- `CM-0604` is a checklist for future widening review, not a self-executing widening switch.
- `CM-0610` defines whether the external token-change assertion is even strong enough to enter this table as `yes`.

## Forbidden Governance Outputs

This note never auto-authorizes:

- `CM-0595`
- `record_memory`
- `search_memory`
- marker search
- second write
- `start:http:ensure`
- `/health` probe
- `observe:http`
- `.jsonl` read
- provider/model call
- config file edit
- `.env` edit
- watchdog/startup persistence change
- public MCP expansion
- migration/import/export/backup/restore apply
- readiness claim

## Practical Current Reading

As of the current chain state:

- endpoint/startup evidence already exists through `CM-0592`
- latest rebound evidence is still `CM-0603 = CURRENT_SESSION_TOKEN_STILL_MISSING`
- `CM-0602` defines the present auto-authorization cap
- `CM-0604` defines the future widening gate
- this decision table clarifies that the only currently automatable approval text is the `CM-0601` line, and only after an external token-availability change is asserted

So the current outcome remains:

```text
NO_AUTO_APPROVAL_ISSUED
RC_NOT_READY_BLOCKED
```

until token material independently exists in the current session.

## Next Safe Action

Keep this note as the current decision-table layer for the chain.

Do not treat it as adoption of widening.

Use it to keep future automation fail-closed:

- no external token change -> no auto-approval
- external token change plus CM-0602 satisfied -> only auto-reuse `CM-0601`
- rebound success later -> escalate for widening review, not direct `CM-0595`
