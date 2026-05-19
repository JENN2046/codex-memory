# LOCAL_RC_CANDIDATE_001

Status: LOCAL_RC_CANDIDATE_001_RECORDED_NOT_RC_READY
Decision: NOT_READY_BLOCKED
Scope: local candidate status and dogfood boundary only
Date: 2026-05-20

## Summary

`LOCAL_RC_CANDIDATE_001` records that the local evidence chain is strong enough to start a local, scoped, non-release dogfood lane.

It does not authorize push, tag, release, deploy, RC cutover, provider calls, real memory broad scans, durable writes, migration/import/export/backup/restore apply, public MCP expansion, or readiness claims.

## Evidence State

| Item | Result | Meaning |
|---|---|---|
| RC_PRECHECK_001 | PRECHECK_PASSED_NOT_RC_READY | Readonly/local precheck evidence passed and was recorded. |
| Read-only rollback rehearsal | READONLY_ROLLBACK_REHEARSAL_COMPLETED_NOT_READY | Rollback range was inspected read-only and was recorded. |
| Real rollback | A5 blocked | Rollback range includes src/tests, so real rollback requires separate exact A5 approval and validation plan. |
| Dogfood | local/scoped/non-release only | Dogfood may start only inside a local candidate lane with explicit boundaries. |
| RC state | NOT_READY_BLOCKED | No RC ready, cutover ready, production ready, or runtime-ready claim is made. |
| V8 / VCP parity | not claimed | V8 is not implemented, and VCP full parity is not claimed. |

## Dogfood Boundary

Allowed dogfood posture:

- local only
- scoped to explicitly named commands or workflows
- non-release
- non-production
- no push/tag/release/deploy
- no public MCP expansion
- no provider/model call unless separately approved
- no real memory broad scan unless separately approved
- no durable write unless separately approved
- no migration/import/export/backup/restore apply unless separately approved
- no readiness claim

## Required Stop Conditions

Stop before:

- real rollback, reset, restore, revert, or checkout rollback
- provider/model call
- real memory broad scan
- durable memory or audit write
- migration/import/export/backup/restore apply
- public MCP expansion
- config/watchdog/startup change
- push, tag, release, deploy, or RC cutover
- `RC_READY`, runtime readiness, final RC readiness, production readiness, or cutover readiness claim

## Result

LOCAL_RC_CANDIDATE_001_RECORDED_NOT_RC_READY

