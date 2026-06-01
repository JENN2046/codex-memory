# CM-1350 A5-GAP-6 Post-CM1349 Source/Test Aggregation Preflight

Date: 2026-06-01

Status: `PREFLIGHT_ONLY_NOT_APPROVED_NOT_READY`

## Scope

CM-1350 prepares a future exact approval boundary for a post-hardening `A5-GAP-6` ValidationAggregator refresh after:

- the CM-1249 through CM-1348 source/test hardening run;
- the CM-1330 through CM-1348 `FieldAliasNormalizer`收口 run;
- the CM-1349 runtime gap delta matrix.

This preflight does not execute ValidationAggregator. It does not scan files or stores, run MCP tools, read real memory, read raw audit, write durable memory/audit, call providers, change config/watchdog/startup, expand public MCP tools, push, tag, release, deploy, run cutover, or claim readiness.

## Current Local Preflight Baseline

Observed before this docs-only preflight:

```text
branch=main
HEAD=4fc75d68b79d2fe2bee7bcb576360b508cacb5c6
branch_state=main...origin/main [ahead 3]
worktree=dirty with current local source/test/docs/board changes
untracked_left_untouched=CLAUDE.md, docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md
```

This baseline is not an execution target. Any future approval must bind to a fresh post-commit `HEAD`.

## Selected Sanitized Source/Test Evidence

Only already recorded sanitized source/test/status evidence is selected for future aggregation input preparation:

| Evidence group | Selected recorded evidence | Runtime meaning |
|---|---|---|
| Runtime gap delta | `docs/CURRENT_RUNTIME_GAP_DELTA_AFTER_CM1326.md`; `CM-1349 / CMV-1467` | Gap map only, no readiness closure |
| Field alias normalizer core | `CM-1330 / CMV-1448` | Shared local helper and tests |
| Mutation audit snapshot aliases | `CM-1331 / CMV-1449` | Local source/test hardening only |
| Shadow projection aliases | `CM-1332 / CMV-1450`; `CM-1280 / CMV-1398` | Fixture/source projection hardening only |
| AuditLogStore selected/manifest aliases | `CM-1333` through `CM-1339`; `CMV-1451` through `CMV-1457` | Temp-local audit fixture hardening only |
| MemoryWriteService / lifecycle preflight aliases | `CM-1340` through `CM-1344`; `CMV-1458` through `CMV-1462` | Fixture/local write preflight hardening only |
| Runtime-prep and pair outcome aliases | `CM-1345` through `CM-1347`; `CMV-1463` through `CMV-1465` | Fixture/local lifecycle helper hardening only |
| Lifecycle scope governance aliases | `CM-1348 / CMV-1466` | Fixture/local lifecycle governance hardening only |
| Client identity and read/write authority hardening | `CM-1264` through `CM-1279`; associated validation rows in `.agent_board/VALIDATION_LOG.md` | Local tests only unless separately refreshed live |
| No-token overview / HTTP contract hardening | `CM-1255` through `CM-1263`; associated validation rows in `.agent_board/VALIDATION_LOG.md` | Historical/source/test only; live refresh still required |
| Schema / startup / recovery local hardening | `CM-1249` through `CM-1254`; associated validation rows in `.agent_board/VALIDATION_LOG.md` | Local/source/preflight only |

Excluded from this preflight:

- raw memory or raw audit content;
- real store scans;
- broad `.jsonl` reads;
- live client results not freshly produced under a separate boundary;
- dogfood write/recall results;
- provider results;
- remote state;
- unstaged private/untracked files.

## Future Approval Template

After this preflight is committed or otherwise stabilized, run fresh Git checks and replace the commit placeholder with the current `HEAD`:

```text
I approve A5-GAP-6 for codex-memory on branch main at commit <FRESH_HEAD_AFTER_CM1350>, using only evidence from approved A5-GAP units A5-GAP-1, A5-GAP-2, A5-GAP-3, A5-GAP-4, A5-GAP-5, including CM1350_A5_GAP6_POST_CM1349_SOURCE_TEST_AGGREGATION_PREFLIGHT.md, no new runtime action.
```

The included evidence filename must be the basename only. The current verifier rejects path-bearing `included` evidence values.

## Template Self-Check

The local template renderer was checked with the current preflight baseline commit as a grammar check only:

```powershell
node src\cli\a5-approval-check.js --template --expected-unit A5-GAP-6 --expected-branch main --expected-commit 4fc75d68b79d2fe2bee7bcb576360b508cacb5c6 --approved-units A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5 --included-evidence CM1350_A5_GAP6_POST_CM1349_SOURCE_TEST_AGGREGATION_PREFLIGHT.md --no-new-runtime-action --json --pretty
```

Result:

```text
templateRendered=true
templateSelfCheck.approvalAccepted=true
authorizationGranted=false
runtimeReady=false
finalRcMatrixReady=false
rcReady=false
```

This check renders text only. It does not grant approval and does not execute A5-GAP-6.

## Approved Action If Exact Approval Is Later Given

Only an in-memory explicit sanitized summary aggregation is in scope. The future evidence run must:

- consume only the approved A5-GAP units named in the exact approval line;
- consume this preflight document only as an included sanitized source/test evidence map;
- set `commandsExecutedByAggregator=false`;
- avoid evidence collection by scanning files/stores;
- keep readiness false unless separately proven by later live-client, dogfood, strict-gate, and cutover evidence;
- record remaining gaps rather than closing live/runtime gaps from source/test evidence.

## Explicitly Out Of Scope

- live `record_memory` / `search_memory`;
- real memory scan/export/import/migration;
- raw memory, raw audit, or broad `.jsonl` read;
- provider/API call;
- MCP `tools/call`;
- durable memory write;
- durable audit write;
- migration/import/export/backup/restore apply;
- config/watchdog/startup change;
- dependency or lockfile change;
- public MCP tool/schema expansion;
- push / PR / tag / release / deploy;
- RC cutover;
- runtime readiness, write reliability, recall reliability, or `RC_READY` claim.

## Required Fresh Preflight Before Any Execution

Before any exact-approved execution, run and inspect:

```powershell
git status --short --branch
git rev-parse HEAD
git log --oneline --decorate -n 10
git diff --stat
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
```

Stop if:

- `HEAD` differs from the exact approval line;
- the worktree has unrelated or unsafe changes;
- untracked files would be included or modified;
- any `.env`, secret, package manifest, lockfile, config, watchdog/startup, or public MCP surface changes unexpectedly;
- the execution would need live memory, provider, store scan, durable write, remote action, or readiness claim.

## Current Result

```text
preflightPrepared=true
approvalGranted=false
validationAggregatorExecuted=false
runtimeEvidenceSummaryAccepted=false
commandsExecutedByAggregator=false
filesScannedByAggregator=false
storesScanned=false
runtimeReady=false
finalRcMatrixReady=false
rcReady=false
decision=NOT_READY_BLOCKED
```
