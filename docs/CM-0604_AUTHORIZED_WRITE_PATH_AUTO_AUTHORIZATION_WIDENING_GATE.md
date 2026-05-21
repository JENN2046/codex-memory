# CM-0604 Authorized Write-Path Auto-Authorization Widening Gate

Status: DRAFT_LOCAL_RULE_NOT_EXECUTED
Decision: WRITE_PATH_AUTO_AUTHORIZATION_WIDENING_NOT_ADOPTED
Date: 2026-05-20

## Purpose

This note defines the future gate that would have to pass before automatic authorization could widen beyond CM-0601 reuse and reach:

```text
docs/CM-0595_AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_PACKET.md
```

It does not widen anything by itself.

It does not authorize `record_memory`.

It does not authorize `search_memory`.

It exists only to make the future widening criteria explicit and auditable.

## Current Position

Current governance-only auto-authorization stops here:

```text
docs/CM-0602_CURRENT_SESSION_TOKEN_REBOUND_AUTO_AUTHORIZATION_RULE.md
```

That rule permits future auto-reuse only for CM-0601-style rebound presence-only checks.

It explicitly does not reach CM-0595.

## Proposed Widening Target

The only widening target reviewed by this note is:

```text
AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_001
```

through:

```text
docs/CM-0595_AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_PACKET.md
```

No recall, provider, config, startup persistence, public MCP expansion, or durable mutation beyond the single approved write-validation unit is in scope.

## Required Preconditions Before Any Widening Review

All of the following would have to be true before widening can even be considered:

1. `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md` still controls the mainline.
2. Controlling status still remains `RC_NOT_READY_BLOCKED`.
3. Same-baseline endpoint/startup evidence still exists through:

```text
docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md
```

4. A future same-baseline rebound presence-only execution has already succeeded and proven token presence.
5. No provider/config/startup-persistence/public-MCP-surface change has been introduced since the proving evidence.
6. No broad real-memory scan, `.jsonl` read, or additional durable write is needed to justify the widening.
7. Docs/board still show the write path as not yet validated.

Without all seven, widening remains blocked.

## Additional Requirements Beyond CM-0602

Even if CM-0602 still holds, widening to CM-0595 would additionally require:

- a successful same-baseline rebound result, not another token-missing result
- a fresh drift check that shows the packet family has not materially changed
- an explicit determination that one exactly-once sanitized write validation is now the narrowest next proof step
- a governance decision that automatic authorization may cross from no-write proof into one bounded durable-write proof

That last bullet is the key boundary.

CM-0602 does not decide it.

## What This Gate Still Refuses

Even if this widening gate were later adopted, it still would not automatically authorize:

- `search_memory`
- marker search
- second write
- provider/model call
- config file edit
- `.env` edit
- watchdog/startup persistence change
- public MCP expansion
- migration/import/export/backup/restore apply
- readiness claim

Those remain out of scope.

## Adoption Requirement

This note is governance-only preparation.

Widening remains disallowed until a later docs/board decision explicitly says all listed preconditions were met and the widening is adopted.

Until then:

```text
CM-0595 remains a separate exact approval boundary.
```

## Next Safe Action

Keep this note as the future widening checklist only.

Use CM-0602 as the current cap.

Do not treat this note as present authorization for CM-0595.
