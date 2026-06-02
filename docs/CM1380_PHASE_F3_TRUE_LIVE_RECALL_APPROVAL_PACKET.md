# CM-1380 Phase F3 True-Live Recall Approval Packet

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_F3_APPROVAL_PACKET_SURFACED_NOT_READY`

Decision: `NOT_READY_BLOCKED`

Operator state: `RC_NOT_READY_BLOCKED`

## Scope

CM-1380 prepares the Phase F3 true-live recall negative-control proof approval-packet surface after F1 and F2 evidence were accepted and synced.

This packet does not execute `search_memory`, call MCP, call providers, start services, read raw memory content, read `.jsonl`, read raw audit, write durable memory/audit, change config/watchdog/startup, expand public MCP tools, push, tag, release, deploy, cut over, or claim readiness/reliability.

## Fresh Pre-Edit Current Facts

- Branch before CM-1380 edits: `main`
- Pre-edit `HEAD == origin/main == 171cfb14e70af8665d3349be6e0b02d0f119b7e1`
- Pre-edit `main...origin/main == 0 / 0`
- Worktree clean: `true`
- F1 evidence accepted: `true`
- F2 evidence accepted: `true`
- F3 evidence accepted: `false`

These facts prove that the F3 preflight surface can become ready on a clean synced post-F2 head. They are not a durable approval target after CM-1380 is committed, because the commit itself will move `HEAD`.

## Read-Only F3 Preflight Result

`node src\cli\recall-proof-current-facts-preflight.js --json --pretty` returned:

- Status: `ok`
- Decision: `RECALL_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED`
- Accepted for execution preflight: `true`
- Execution started: `false`
- Live proof started: `false`
- Blocker reasons: none
- Approval binding: `head_bound_commit`
- Bound commit: `171cfb14e70af8665d3349be6e0b02d0f119b7e1`
- Clean synced main head: `true`
- Exact query family bound: `true`
- Internal proof seam bound: `true`
- Boundary flags bound: `true`

Required query family:

| Slot | Family | Text | Expected result count |
|---|---|---|---:|
| Q1 | `stricter_negative_control` | `xqzv-9137-lomdra-kepv-azmuth` | 0 |
| Q2 | `stricter_negative_control` | `nareth-48291-pluvox-darnel-kiv` | 0 |
| Q3 | `stricter_negative_control` | `vornik-73019-quaspel-threnn-ulo` | 0 |
| Q4 | `stricter_negative_control` | `mavrix-60428-selkun-dopra-nyxal` | 0 |

Required proof seam:

- Runner: `TrueLiveRecallReadonlyProofRunner`
- Adapter: `createTrueLiveRecallExecutorAdapter`
- App tool: `search_memory`
- Request source: `internal-true-live-recall-readonly-proof-runner`

Required boundary flags:

- Read-only: `true`
- No provider: `true`
- No audit: `true`
- No token read-only: `true`
- No raw content read: `true`
- Include content: `false`
- Precision policy enabled: `true`
- Proof no-result mode: `true`
- Sanitized output: `true`

## Dynamic Approval Template Surface

The Phase F snapshot now renders the head-bound F3 approval template from fresh Git facts. After CM-1380 is committed and synced, rerun:

```powershell
node .\src\cli\phase-f-personal-rc-readiness-snapshot.js --json --pretty
```

Use `approvalTemplates.f3TrueLiveRecallApprovalTemplate` only when:

- `completionCriteria.f1LiveNoWriteEvidenceAccepted=true`;
- `completionCriteria.f2A5Gap6AggregationAccepted=true`;
- `approvalTemplates.f3TrueLiveRecallTemplateCurrentlyUsable=true`;
- `currentHead == originHead`;
- `ahead == 0`;
- `behind == 0`;
- `worktreeClean=true`.

Template shape:

```text
I approve MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_EXECUTION_ONCE for codex-memory on branch main at commit <FRESH_SYNCED_POST_CM1380_HEAD>, limited to exactly four read-only true live search_memory calls against the current local codex-memory real store using the CM-0814 stricter negative-control query family, with no provider call, no direct .jsonl read, no raw memory output, no durable memory/audit write, no migration/import/export/backup/restore apply, no config/watchdog/startup change, no public MCP expansion, no package/lockfile change, no tag/release/deploy/cutover, and no readiness or reliability claim.
```

## Safety Counters

- `search_memory` calls executed by CM-1380: `0`
- MCP tools/call executed by CM-1380: `0`
- Provider calls: `0`
- Real memory reads: `0`
- Raw memory output: `false`
- Direct `.jsonl` reads: `0`
- Durable memory writes: `0`
- Durable audit writes: `0`
- Service starts: `0`
- Config/watchdog/startup changes: `0`
- Public MCP expansion: `false`
- Remote actions: `0`
- Readiness claims: `0`
- Reliability claims: `0`

## Boundary

CM-1380 only prepares the F3 approval surface. It does not satisfy F3 and does not create a reusable static approval line.

After CM-1380 is committed and synced, use the fresh snapshot-rendered exact approval line. After the operator provides that exact approval line, F3 may execute only the bounded proof described above. A passing F3 proof may unblock F4 preflight, but it still must not claim recall reliability, personal dogfood readiness, RC readiness, cutover readiness, or release readiness.
