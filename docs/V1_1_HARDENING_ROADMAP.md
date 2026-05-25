# v1.1 Hardening Roadmap

Status: `V1_1_HARDENING_TRACK_OPENED_NOT_IMPLEMENTED`
Date: 2026-05-25
Workspace: `A:\codex-memory`
Baseline: `f4549b4a1a9265bdc867c35b72f66d8d1a1a66a9`
Sealed RC tag: `v1.0.0-rc.1`

## Purpose

This document opens the v1.1 hardening track after the sealed v1.0 RC candidate baseline.

It does not rewrite, retag, move, delete, or reinterpret `v1.0.0-rc.1`. The tag remains sealed on `f4549b4a1a9265bdc867c35b72f66d8d1a1a66a9`.

This roadmap is docs/status only. It does not implement runtime behavior, call providers, call true `record_memory` or true `search_memory`, read raw memory, read direct `.jsonl`, read raw audit, expand public MCP, apply cleanup, apply rollback, change package/config/watchdog/startup/dependencies, tag, release, deploy, or claim readiness/reliability.

## Baseline Verification

| Check | Result |
|---|---|
| `git status -sb` | `## main...origin/main` |
| `git rev-parse HEAD` | `f4549b4a1a9265bdc867c35b72f66d8d1a1a66a9` |
| `git rev-parse origin/main` | `f4549b4a1a9265bdc867c35b72f66d8d1a1a66a9` |
| `git ls-remote origin refs/heads/main` | `f4549b4a1a9265bdc867c35b72f66d8d1a1a66a9` |
| local `v1.0.0-rc.1` tag | exists |
| remote `v1.0.0-rc.1` tag object | `93e99ff6615f8d3b7bd978ecd4999db206413351` |
| remote `v1.0.0-rc.1^{}` peeled commit | `f4549b4a1a9265bdc867c35b72f66d8d1a1a66a9` |

## v1.1 Workstreams

Every item in this section is `NOT_IMPLEMENTED` at CM-1080. Each workstream requires its own scoped plan, validation strategy, review, and explicit approval where the project hard-stop gates require it.

| Workstream | Status | v1.1 intent | Not-now boundary |
|---|---|---|---|
| Proof retention/tombstone automation | `NOT_IMPLEMENTED` | Design and implement controlled lifecycle automation for internal proof memories after validation. | No durable cleanup, tombstone apply, retention worker, background task, or real memory mutation is authorized by CM-1080. |
| Reconcile retry/backoff durable persistence | `NOT_IMPLEMENTED` | Persist retry/backoff metadata and dead-letter posture for reconcile tasks. | No SQLite schema migration, queue mutation, replay worker integration, or automatic retry is authorized by CM-1080. |
| Startup reconcile worker safety | `NOT_IMPLEMENTED` | Harden startup/worker safety before any install/startup path can be considered. | No watchdog, scheduled task, HKCU Run, startup config, service install, or client config change is authorized by CM-1080. |
| Cleanup/rollback apply design | `NOT_IMPLEMENTED` | Move from preview-only gates toward reviewed apply design, still fail-closed by default. | No cleanup apply, rollback apply, diary deletion, audit rewrite, or production rollback action is authorized by CM-1080. |
| ValidationAggregator full implementation | `NOT_IMPLEMENTED` | Build full current-head evidence ingestion, stale-evidence rejection, baseline binding, and final matrix authority. | CM-1080 does not change ValidationAggregator source, claim final matrix authority, or mark readiness. |
| Governance runtime approval/audit loop | `NOT_IMPLEMENTED` | Close the governed runtime approval/audit loop with scoped evidence and no raw data leakage. | No governed live memory action, provider/API call, raw memory read, broad audit read, or reliability claim is authorized by CM-1080. |

## Shared Rules For v1.1

- Preserve `v1.0.0-rc.1` exactly as sealed.
- Keep public MCP frozen unless a future separately approved phase explicitly changes the contract.
- Prefer plan and fixture/dry-run proof before runtime mutation.
- Keep raw memory, direct `.jsonl`, and raw audit reads out of routine hardening work.
- Keep cleanup and rollback apply separate from preview/design phases.
- Do not claim production readiness, release readiness, recall reliability, write reliability, or broad runtime readiness from roadmap work.

## Output

```text
V1_1_HARDENING_TRACK_OPENED_NOT_IMPLEMENTED
v1_0_rc_tag_preserved = true
v1_1_items_implemented = false
readiness_claimed = false
reliability_claimed = false
release_claimed = false
deploy_claimed = false
production_ready_claimed = false
```

## Recommended CM1081

Recommended next task:

```text
CM1081_PROOF_RETENTION_TOMBSTONE_AUTOMATION_PLAN
```

Purpose: create a design-first, no-apply plan for proof retention/tombstone automation, with explicit boundaries for no public MCP expansion, no background worker enablement, no cleanup apply, and no readiness/reliability claim.
