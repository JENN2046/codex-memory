# CM-1362 Phase F1 Sync Approval Packet

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1362 prepares the exact normal non-force push approval packet required before Phase F1 can resume from a fresh synced `HEAD`.

This document does not push, pull, merge, rebase, start services, call MCP, call providers, read real memory bodies, read raw audit, write durable memory/audit, change config/watchdog/startup, expand public MCP tools, tag, release, deploy, cut over, or claim readiness.

## Fresh Git Facts

Observed before this packet:

```text
branch=main
HEAD=c28170a
origin/main=be980d1
ahead=7
behind=0
worktree=clean
```

Local commits not on `origin/main`:

```text
c28170a docs: prepare conditional phase f5 closeout matrix
1c24dbc docs: prepare conditional phase f4 dogfood preflight
83b1073 docs: prepare conditional phase f3 recall preflight
4286dff docs: prepare conditional phase f2 aggregation preflight
579d565 docs: define phase f1 fresh sync preflight
06cdd0e docs: record phase f1 sync blocker
6adde16 feat: prepare phase f1 no-write evidence harness
```

Because local `main` differs from `origin/main`, `src/cli/phase-f1-live-client-no-write.js --execute` must remain blocked. The F1 execution guard requires local `HEAD` and `origin/main` to match.

## Intended Sync Action

The only intended sync action is:

```powershell
git push origin main
```

This must be a normal non-force push from `A:\codex-memory`.

It must not include:

- force push or force-with-lease;
- tag push;
- PR creation or update;
- merge, rebase, cherry-pick, or history rewrite;
- deploy, release, cutover, or production action;
- config/watchdog/startup change;
- provider call;
- MCP call;
- real memory read/write;
- readiness or reliability claim.

## Non-Authorizing Approval Template

This template is not approval. It must be pasted or otherwise explicitly confirmed by the user before any push:

```text
I approve pushing local main commits through c28170a to origin/main for codex-memory from A:\codex-memory, using a normal non-force push to origin main only, with no tags, no PR, no deploy, no release, no merge, no rebase, no config/watchdog/startup change, no provider call, no MCP call, no real memory read/write, and no readiness or reliability claim.
```

## Required Post-Push Checks

After an explicitly approved push, run:

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git rev-list --left-right --count main...origin/main
```

Only if `HEAD` equals `origin/main`, ahead/behind is `0/0`, and the worktree is clean may Phase F1 move to a fresh synced-head A5-GAP-4 live-client no-write approval line.

## Stop Conditions

Stop before sync if any are true:

- approval text is absent or not exact;
- local `HEAD` no longer equals `c28170a`;
- `origin/main` no longer equals `be980d1` before push and the new remote state has not been reviewed;
- worktree is dirty;
- command would be anything other than `git push origin main`;
- push would require force, merge, rebase, tag, PR, deploy, release, cutover, or conflict resolution;
- any secret, provider, MCP, memory, config/watchdog/startup, dependency, or readiness action is requested as part of the sync.

## Current Result

```text
phaseF1SyncApprovalPacketPrepared=true
pushApproved=false
pushExecuted=false
localAhead=7
localBehind=0
decision=NOT_READY_BLOCKED
operatorState=RC_NOT_READY_BLOCKED
nextRequiredAction=explicit_normal_non_force_push_approval
```
