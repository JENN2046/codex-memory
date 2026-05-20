# A5_ENABLEMENT_OBSTACLE_CLEARANCE_001

Status: A5_ENABLEMENT_OBSTACLES_IDENTIFIED
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

This note clears the current planning confusion around "starting A5 automation" for `codex-memory`.

It does not start unlimited A5 automation.

It does not execute provider calls, broad real memory scans, durable memory writes, durable audit writes, migration/import/export/backup/restore apply, config switch, public MCP expansion, push, tag, release, deploy, cutover, or readiness claims.

## Current Mode

Current mode:

```text
A4.8 Single-Window 4-Agent Compact Autopilot
```

Current controlling status:

```text
RC_NOT_READY_BLOCKED
```

`A5` remains an exact-approval execution boundary, not a persistent always-on mode.

## Current Git Reality

Observed current branch and baseline:

```text
branch = main
HEAD = 675895237c96bdebf4718f41c6318dbd5974aebc
origin/main = 675895237c96bdebf4718f41c6318dbd5974aebc
worktree = clean at review start
```

Recent pushed fix:

```text
6758952 fix: return json-rpc error for no-token mutations
```

That fix means no-token HTTP mutation rejection now returns a JSON-RPC error envelope instead of a plain JSON `403` body.

## Obstacles

### Obstacle 1: A5 Cannot Be Blanket-Enabled

Reason: A5 covers high-risk actions that must be named individually.

Cleared now: the operator language is narrowed. The project should use exact A5 approval units instead of "A5 automation" as a standing mode.

Remaining: each A5 action still needs an exact line naming commit, action, target, allowed commands, and forbidden actions.

### Obstacle 2: Authorized Write Path Is Not Yet Accepted

Reason: current live HTTP MCP is loopback no-token. In that posture, `record_memory` is intentionally blocked for mutation calls.

Cleared now: rejected `record_memory` no longer causes `JsonRpcMessage` deserialization failure.

Remaining: an authorized write-path validation still needs a separate exact approval and token/config boundary.

Recommended next packet:

```text
AUTH_WRITE_PATH_VALIDATION_001
```

### Obstacle 3: Current Runtime Gaps Remain Open

Reason: `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md` still has open gaps and explicitly keeps readiness blocked.

Cleared now: no local Git or pushed-fix drift blocks preparing the next A5 packet.

Remaining: runtime gaps remain open until the current truth table says `complete? = yes`.

### Obstacle 4: RC_PRECHECK_002 Target Drift

Reason: `docs/RC_PRECHECK_002_PLAN.md` was planned against older baseline `c840d06`, while current synced HEAD is `6758952`.

Cleared now: drift is explicitly identified.

Remaining: any future `RC_PRECHECK_002` execution must name current target `675895237c96bdebf4718f41c6318dbd5974aebc` or a later exact target.

### Obstacle 5: Public MCP Tool Surface Must Stay Frozen

Reason: public MCP tools are still limited to:

```text
record_memory
search_memory
memory_overview
```

Cleared now: no public MCP expansion is needed for the next A5 packet.

Remaining: `validate_memory` and other future tools remain internal/non-public unless separately approved.

## Cleared Items

- Git is synced after the HTTP JSON-RPC rejection-shape fix.
- Worktree was clean at review start.
- The latest live MCP validation showed health 200, JSON-RPC `initialize`, JSON-RPC `tools/list`, JSON-RPC `Forbidden` for no-token `record_memory`, and bounded `search_memory` result.
- The next A5 entry point should be an exact packet, not broad automation.

## Recommended Next Exact A5 Unit

Recommended next unit:

```text
AUTH_WRITE_PATH_VALIDATION_001
```

Goal:

```text
prove or fail-close the authorized record_memory write path, then verify bounded recall by unique synthetic marker
```

Required approval shape:

```text
I approve AUTH_WRITE_PATH_VALIDATION_001 for codex-memory on branch main at commit 675895237c96bdebf4718f41c6318dbd5974aebc, limited to one sanitized synthetic write and one bounded marker search, with no provider call, no broad real memory scan, no migration/import/export/backup/restore apply, no public MCP expansion, no push/tag/release/deploy/cutover, and no readiness claim.
```

This approval shape still does not authorize:

- exposing bearer token values
- changing Codex or Claude global config
- installing watchdog/startup entries
- provider calls
- broad memory scans
- additional sample creation
- migration/import/export/backup/restore apply
- push, tag, release, deploy, or cutover
- `RC_READY`

## Result

```text
A5_ENABLEMENT_OBSTACLE_CLEARANCE_001_READY_FOR_COMMIT
RC_NOT_READY_BLOCKED
```

## Next Safe Action

Next safe action: review, validate, and locally commit this A5 enablement obstacle-clearing note before requesting any exact A5 execution. 中文解释：下一步只适合把 A5 启动前的障碍和授权入口固定下来，不能把这份说明当成直接执行 A5、写真实记忆、切配置、发布或声明 ready 的授权。
