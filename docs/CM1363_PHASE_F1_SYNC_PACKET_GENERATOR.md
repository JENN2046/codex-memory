# CM-1363 Phase F1 Sync Packet Generator

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1363 adds a read-only local generator for Phase F1 sync approval packets.

This change does not push, pull, merge, rebase, start services, call MCP, call providers, read real memory bodies, read raw audit, write durable memory/audit, change config/watchdog/startup, expand public MCP tools, tag, release, deploy, cut over, or claim readiness.

## Added Surface

```text
src/core/PhaseF1SyncApprovalPacket.js
src/cli/phase-f1-sync-approval-packet.js
tests/phase-f1-sync-approval-packet.test.js
```

The CLI reads local Git facts and renders a non-authorizing normal non-force push approval template:

```powershell
node src\cli\phase-f1-sync-approval-packet.js --json --pretty
```

It does not execute the rendered push command.

## Current Run Result

The generator was executed in the current dirty development state after adding CM-1363 files. It returned:

```text
status=PHASE_F1_SYNC_APPROVAL_PACKET_READY_NOT_EXECUTED
decision=NOT_READY_BLOCKED
currentHead=16b02bba2799097b509fb80cd9dcb7b4f342dd11
originHead=be980d157cbc88b00fc2e641bc66a527538faae9
ahead=8
behind=0
worktreeClean=false
failClosedReasons=dirty_worktree
pushApproved=false
pushExecuted=false
f1LiveExecutionAllowed=false
```

This is expected: while CM-1363 is uncommitted, the generated packet must fail closed for sync.

## Validation

Validated:

```powershell
node --check src\core\PhaseF1SyncApprovalPacket.js
node --check src\cli\phase-f1-sync-approval-packet.js
node --check tests\phase-f1-sync-approval-packet.test.js
node --test tests\phase-f1-sync-approval-packet.test.js
node src\cli\phase-f1-sync-approval-packet.js --json --pretty
node --test tests\lightmemo-cli.test.js
```

Targeted sync packet tests passed `2/2`. Targeted LightMemo tests passed `3/3` when rerun directly.

Default `npm test` was run and did not fully pass in the current environment:

- ambient provider-related environment variables caused `tests/security-profile-config.test.js` failures in the first run;
- after clearing provider-related variables only in the child process, the default suite still failed `2` LightMemo CLI cases because SQLite ExperimentalWarning text appeared in the full-suite command output;
- those LightMemo cases passed when rerun directly.

This validation gap is recorded as environment/full-suite sensitivity. It does not authorize push or F1 execution.

## Current Result

```text
phaseF1SyncPacketGeneratorAdded=true
generatorReadOnly=true
pushApproved=false
pushExecuted=false
phaseF1LiveExecutionApproved=false
phaseF1LiveExecutionRun=false
decision=NOT_READY_BLOCKED
operatorState=RC_NOT_READY_BLOCKED
nextRequiredAction=commit_generator_then_regenerate_clean_sync_packet_or_obtain_explicit_push_approval
```
