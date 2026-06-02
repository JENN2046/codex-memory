# CM-1382 Phase F4 Minimal Dogfood Write Approval Packet

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_F4_APPROVAL_PACKET_SURFACED_NOT_READY`

Decision: `NOT_READY_BLOCKED`

Operator state: `RC_NOT_READY_BLOCKED`

## Scope

CM-1382 prepares the Phase F4 minimal personal dogfood write approval-packet surface after F1, F2, and F3 evidence were accepted and synced.

This packet does not execute `record_memory`, `search_memory`, MCP calls, provider calls, service starts, raw memory reads, direct `.jsonl` reads, broad real memory scans, durable memory/audit writes, config/watchdog/startup changes, public MCP expansion, package/lockfile changes, push, tag, release, deploy, cutover, or readiness/reliability claims.

## Fresh Current Facts

- Branch: `main`
- `HEAD == origin/main == e564b5c67093f93657ecf3a8841d9daf2ec90051`
- `main...origin/main == 0 / 0`
- Worktree clean before CM-1382 edits: `true`
- F1 evidence accepted: `true`
- F2 evidence accepted: `true`
- F3 evidence accepted: `true`
- F4 evidence accepted: `false`

These facts prove that the F4 approval surface can become usable on a clean synced post-F3 head. They are not a durable execution approval by themselves.

## Dynamic Approval Template Surface

The Phase F snapshot now renders a head-bound F4 approval template from fresh Git facts. After CM-1382 is committed and synced, rerun:

```powershell
node .\src\cli\phase-f-personal-rc-readiness-snapshot.js --json --pretty
```

Use `approvalTemplates.f4MinimalDogfoodWriteApprovalTemplate` only when:

- `completionCriteria.f1LiveNoWriteEvidenceAccepted=true`;
- `completionCriteria.f2A5Gap6AggregationAccepted=true`;
- `completionCriteria.f3TrueLiveRecallNegativeControlAccepted=true`;
- `completionCriteria.f4MinimalDogfoodWriteAccepted=false`;
- `approvalTemplates.f4MinimalDogfoodWriteTemplateCurrentlyUsable=true`;
- `currentHead == originHead`;
- `ahead == 0`;
- `behind == 0`;
- `worktreeClean=true`.

Template shape:

```text
I approve MEMORY_WRITE_MINIMAL_PERSONAL_DOGFOOD_EXECUTION_ONCE for codex-memory on branch main at commit <FRESH_SYNCED_POST_CM1382_HEAD>, limited to exactly one sanitized record_memory call against the current local codex-memory real store for Phase F4 personal dogfood proof, using current-session bearer token if already present, without printing or persisting token material, allow only the durable memory/audit write required for that single sanitized dogfood record, with no provider call, no search_memory call, no raw memory output, no direct .jsonl read, no broad real memory scan, no migration/import/export/backup/restore apply, no config/watchdog/startup change, no public MCP expansion, no package/lockfile change, no tag/release/deploy/cutover, and no readiness or reliability claim.
```

## Safety Counters

- `record_memory` calls executed by CM-1382: `0`
- `search_memory` calls executed by CM-1382: `0`
- MCP tools/call executed by CM-1382: `0`
- Provider calls: `0`
- Real memory reads: `0`
- Real memory writes: `0`
- Raw memory output: `false`
- Direct `.jsonl` reads: `0`
- Broad real memory scans: `0`
- Durable memory writes: `0`
- Durable audit writes: `0`
- Service starts: `0`
- Config/watchdog/startup changes: `0`
- Public MCP expansion: `false`
- Remote actions: `0`
- Readiness claims: `0`
- Reliability claims: `0`

## Boundary

CM-1382 only prepares the F4 approval surface. It does not satisfy F4 and does not create a reusable static approval line.

After CM-1382 is committed and synced, use the fresh snapshot-rendered exact approval line. After the operator provides that exact approval line, F4 may execute only the bounded one-record sanitized dogfood write described above. A passing F4 proof may unblock F5 closeout, but it still must not claim broad write reliability, recall reliability, RC readiness, cutover readiness, or release readiness.
