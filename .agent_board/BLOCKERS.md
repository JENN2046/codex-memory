## CMB-0006 - RC_PRECHECK_001 exact A5 approval required

- Status: `CLOSED_READONLY_EXECUTED_RECALL_NOT_APPROVED`
- Area: `P10-observability-admin / RC_PRECHECK_001`
- Blocking tasks: none for readonly precheck; recall observation and aggregation execution remain separate approval boundaries
- Current executed readonly target: `a6030f36b3026d360c6aa99f97a2d1af44365433`
- Resolution: exact `A5-RC-PRECHECK-READONLY` approval was provided and executed; `A5-RC-PRECHECK-RECALL` was not approved or run.
- Safe state: readonly evidence recorded as `PRECHECK_PASSED_NOT_RC_READY`; project remains `NOT_READY_BLOCKED`.
- Do not run without new exact approval: recall path observation, A5-GAP-6 aggregation execution, provider calls, real memory broad scans, migration/import/export/backup/restore apply, config/watchdog/startup changes, public MCP expansion, durable writes, push, tag, release, deploy, cutover, or `A5-GAP-7`.
- Next boundary: prepare a separate A5-GAP-6 evidence-only aggregation packet, or request separate recall approval with exact subject/query/audit boundary.

# BLOCKERS.md — codex-memory

| ID | Status | Type | Area | Affected Task | Reason | Required Human Action | Created |
|---|---|---|---|---|---|---|---|
| CMB-0001 | closed | template | none | none | Template row retired | none | 2026-05-05 |
| CMB-0002 | closed | outside-workspace-write | P9-codex-claude-client-scope | CM-0025 | `claude mcp add` writes Claude local/user configuration outside `A:\codex-memory` | Authorized and completed; rollback is `claude mcp remove vcp_codex_memory -s local` | 2026-05-06 |
| CMB-0003 | closed | model-api-connectivity | P9-codex-claude-client-scope | CM-0025 | `deepseek-v4-pro` model-mediated tool call previously failed before MCP tool execution with API `ConnectionRefused` | Rerun completed; `deepseek-v4-pro` model-mediated `memory_overview` succeeded | 2026-05-06 |
| CMB-0004 | open | A5-approval-boundary | P22-release-candidate | CM-0161 | P22 planning is closed, but fresh RC gate refresh / implementation may run heavy gates, touch live/client/provider/config surfaces, or create release artifacts | User must explicitly approve an exact A5 RC gate refresh / implementation packet before any gate refresh, config/service/provider/migration/import-export, RC artifact, tag, release, or deploy action | 2026-05-15 |
| CMB-0005 | open | A5-runtime-completion-boundary | P51-P62-runtime-enforced-governed-memory-spine | P62-completion-audit | P51-P62 local evidence/preflight/audit artifacts are complete to the post-T6 audit/refinement closeout; P64 local evidence has reduced the active runner gap list to 7 runtime gaps, but `objectiveComplete=false`, A5 hard stops, and `NOT_READY_BLOCKED` still apply | Separate explicit authorization and fresh machine-readable evidence are required before any governance runtime loop, recall runtime proof, migration/import-export/backup-restore apply, live HTTP operation readiness, cutover-context mainline strict gate, push/tag/release/deploy/config/watchdog/cutover, durable write, provider call, real memory scan, public MCP expansion, or `RC_READY` claim | 2026-05-18 |
| CMB-0013 | closed-readonly-baseline-ready | dirty-worktree-proof-baseline | P0-mainline-health / P4-http-runtime | CM-1011 current recall preflight review | CM-1011 re-ran fresh Git facts on clean synced `main` at `fcc87f3842095c9a2d48a4d49a041baec27026a4`; recall current-facts preflight returned `RECALL_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED` with dirty status count `0`. The old dirty-worktree blocker no longer describes current baseline facts. | None for the dirty-baseline blocker. Future live recall proof still remains separate not-executed work and must fail closed if the baseline becomes dirty, stale, ambiguous, source-drifted, or claims readiness/reliability. | 2026-05-24 |
| CMB-0014 | closed-readonly-baseline-ready | dirty-worktree-write-proof-baseline | P0-mainline-health / P8-memory-governance | CM-1011 current write preflight review | CM-1011 re-ran fresh Git facts on clean synced `main` at `fcc87f3842095c9a2d48a4d49a041baec27026a4`; write current-facts preflight returned `WRITE_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED`, and combined baseline readiness returned `MEMORY_RELIABILITY_PROOF_BASELINE_READY_NOT_EXECUTED`. The old dirty-worktree blocker no longer describes current baseline facts. | None for the dirty-baseline blocker. Future live write proof still remains separate not-executed work and must fail closed if the baseline becomes dirty, stale, ambiguous, source-drifted, missing exact basis/seam/scope/boundary/result input, or claims readiness/reliability. | 2026-05-24 |
| CMB-0015 | closed-bounded-post-guard-proof | recall-negative-control-proof-failure | P0-mainline-health / P2-active-memory | CM-1013 CM0825 post-guard recall proof execution | CM-1013 executed one clean-head post-guard CM0825 proof at `5f29c3dc844a1c9b12483aba93ab48087a92b1fe`; Q4 `stricter_negative_control` returned `0` with all side-effect counters zero and sanitized output only. | None for the exact post-guard proof gap. Broader recall reliability remains unproven and requires separate evidence/review. | 2026-05-25 |
| CMB-0016 | closed-source-fail-closed | no-token-selected-output-boundary | P4-http-runtime / P8-memory-governance / P9-codex-claude-client-scope | CM-1183 no-token memory_overview HTTP block | CM-1182 found no-token `memory_overview` shared authorized overview projection. CM-1183 now blocks no-token HTTP `memory_overview` before tool execution with 403 / `NO_TOKEN_OVERVIEW_REJECTED`, preserving bearer-token overview. | None for the HTTP fail-closed blocker after commit. Full no-token selected overview projection remains optional future work, not required for this blocker closure. | 2026-05-26 |
| CMB-0017 | open-status-synced | status-surface-not-ready-boundary | P6-docs-drift / P10-observability-admin | CM-1201 blocker-scope correction for CM-1185 / CM-1200 | CM-1201 records this blocker row as the blocker-scope artifact for CM-1185 / CM-1200 not-ready status-surface work. CM-1185 records branch and validation evidence, but it does not run fresh mainline/strict gates, HTTP observe, provider validation, real memory tools, push-readiness, or any readiness/reliability closure. | None for status sync. Separate exact scope and approval/evidence remain required before provider calls, real memory action, config/watchdog/startup change, public MCP expansion, push/PR/tag/release/deploy, or readiness/reliability claim. | 2026-05-31 |
| CMB-0018 | open-preflight-blocked | Red-line-A5-recall-proof-current-facts | P9-codex-claude-client-scope / P8-memory-governance / P0-mainline-health | CM-1328 Red-line/A5 recall proof entry plan | Read-only current-facts preflight for true-live recall negative-control proof blocked with `local_origin_head_mismatch` and `dirty_worktree`; local `main` was `7c311c8d9a535a6f49c1c1673be59a8155c1bab4`, `origin/main` was `0a992a87808cb2f20f40da93edf9df8c6c7d4572`, and two untracked files were present. Approval/query/seam/boundary controls were bound, but live proof remains not executed. | Before any live proof: reach clean synced `main`, rerun `node src\cli\recall-proof-current-facts-preflight.js --json --pretty`, provide the implemented exact approval line, and preserve no raw memory/provider/durable-write/config/startup/public-MCP/readiness boundaries. | 2026-06-01 |
| CMB-0019 | open-preflight-blocked | Red-line-A5-recall-proof-head-bound-current-facts | P9-codex-claude-client-scope / P8-memory-governance / P0-mainline-health | CM-1329 recall proof head-bound approval | CM-1329 changed the current-facts approval binding to `head_bound_commit`, but the read-only preflight still blocks live proof because local `main` is not synced with `origin/main` and the worktree is dirty. This is an acceptance blocker for live proof execution, not a source/test blocker for CM-1329. | Before any live proof: stabilize/push local commits only with separate authorization, reach clean synced `main`, rerun current-facts preflight, and execute only the bounded exact-approved proof path. | 2026-06-01 |
| CMB-0020 | open-live-contract-blocked | Phase-F1-live-no-write-no-token-contract | P4-http-runtime / P9-codex-claude-client-scope / P0-mainline-health | CM-1365 Phase F1 live no-write rejected evidence | Exact-approved F1 bounded no-write harness executed on clean synced `main@546915b`, but evidence was rejected fail-closed because no-token `memory_overview` did not return selected projection and no-token `record_memory/search_memory` rejections did not expose expected reason codes. | Do not proceed to F2/F3/F4/F5. Next safe work is local source/test hardening or exact operator decision for authenticated HTTP no-token selected overview/rejection-code contract; any service restart/config/watchdog/startup/provider/memory-write/real-recall/readiness action needs separate approval. | 2026-06-02 |
| CMB-0021 | open-live-contract-blocked | Phase-F1-live-no-write-rerun-rejected | P4-http-runtime / P9-codex-claude-client-scope / P0-mainline-health | CM-1373 Phase F1 live no-write rerun rejected evidence | Exact-approved F1 bounded no-write harness executed again on clean synced `main@dd5018dfbc564975e0e6a93aebdeba38821760a0` after local contract hardening was pushed, but evidence was still rejected fail-closed because no-token `memory_overview` did not return selected projection and no-token `record_memory/search_memory` rejections did not expose expected reason codes. | Do not proceed to F2/F3/F4/F5. Next safe work is local source/test/runtime-contract investigation or separate exact operator decision for service freshness/runtime alignment; any service restart, config/watchdog/startup change, provider call, durable write, real recall, real memory write, or readiness claim needs separate approval. | 2026-06-02 |
| CMB-0022 | open-runtime-refresh-approval-required | Phase-F1-runtime-process-stale | P4-http-runtime / P9-codex-claude-client-scope / P0-mainline-health | CM-1374 Phase F1 runtime freshness diagnostic | Read-only runtime freshness diagnostic identifies the 7605 listener as `runtime_process_started_before_head`; the running `node.exe A:\codex-memory\scripts\serve-codex-memory-http.js` process started before current HEAD, so live endpoint behavior may still reflect stale source. | Obtain separate exact approval before stopping/restarting/refreshing the local HTTP runtime. No config/watchdog/startup install or modification, provider call, MCP tools/call, real memory read/write, durable write, remote action, readiness claim, or reliability claim may occur without explicit scope. | 2026-06-02 |
| CMB-0023 | open-f1-rerun-approval-required | Phase-F1-runtime-fresh-no-write-evidence-missing | P4-http-runtime / P9-codex-claude-client-scope / P0-mainline-health | CM-1375 Phase F1 runtime refresh evidence | Runtime freshness was accepted for `main@30a77afe092493e4891e945531c5526dfd261164` after exact-approved local refresh, but recording CM-1375 can create a newer HEAD and F1 live no-write evidence has not been rerun. | Sync evidence commit if needed, rerun freshness for the current synced HEAD, refresh runtime again under exact approval if required, then obtain exact A5-GAP-4 live-client no-write approval before rerunning F1. Do not proceed to F2/F3/F4/F5 until F1 evidence is accepted. | 2026-06-02 |
| CMB-0024 | open-sync-then-f1-approval-required | Phase-F1-freshness-loop-fixed-awaiting-sync | P4-http-runtime / P9-codex-claude-client-scope / P0-mainline-health | CM-1376 Phase F1 runtime freshness docs-only HEAD fix | The docs-only HEAD freshness loop is fixed locally, but current work must be committed/synced before F1 can continue. | Commit/sync CM-1376 if guarded/approved, rerun freshness on clean synced HEAD, then request exact A5-GAP-4 live-client no-write approval. Do not proceed to F2/F3/F4/F5 until F1 evidence is accepted. | 2026-06-02 |
| CMB-0025 | closed-f2-accepted-not-ready | Phase-F2-a5-gap6-aggregation-approval-missing | P8-memory-governance / P9-codex-claude-client-scope / P0-mainline-health | CM-1379 Phase F2 A5-GAP-6 aggregation evidence | Exact A5-GAP-6 approval was provided for `main@e032444e93a207e83e7628acd3c69227ad8fcb28` and executed as evidence-only in-memory aggregation using approved A5-GAP-1..5 plus CM-1377 F1 evidence. | None for F2. F3 true-live recall negative-control proof remains separate exact-approval boundary. | 2026-06-02 |
| CMB-0026 | closed-f3-accepted-not-ready | Phase-F3-true-live-recall-negative-control-execution-approval-missing | P9-codex-claude-client-scope / P8-memory-governance / P0-mainline-health | CM-1381 Phase F3 true-live recall negative-control evidence | Exact F3 approval was provided for `main@4bbd27892d07159ebb9397701985e31507126a74` and executed as bounded read-only negative-control proof. | None for F3. F4 minimal personal dogfood write remains separate exact-approval boundary. | 2026-06-02 |
| CMB-0027 | closed-f4-accepted-not-ready | Phase-F4-minimal-personal-dogfood-write-approval-missing | P9-codex-claude-client-scope / P8-memory-governance / P0-mainline-health | CM-1383 Phase F4 minimal dogfood write evidence | Exact F4 approval was provided for `main@13a3a313e99611b31ba671fadb63e0f61797b5aa` and executed as one sanitized `record_memory` dogfood write. | None for F4. F5 closeout remains separate not-yet-complete boundary and must not claim RC ready. | 2026-06-02 |
| CMB-0028 | open-f5-closeout-required | Phase-F5-personal-rc-closeout-missing | P9-codex-claude-client-scope / P8-memory-governance / P0-mainline-health | CM-1383 Phase F4 minimal dogfood write evidence | F1/F2/F3/F4 evidence are accepted, but F5 closeout has not yet aggregated the evidence chain into `PERSONAL_DOGFOOD_READY_NOT_RC_READY`. | Run local closeout evidence/snapshot work only after CM-1383 is recorded and validated. F5 may claim `PERSONAL_DOGFOOD_READY_NOT_RC_READY` only if the fresh evidence chain proves F1-F4 and closeout criteria; it must not claim `RC_READY`, broad reliability, release readiness, cutover, deploy, tag, provider, additional memory writes, or remote action without separate scope. | 2026-06-02 |

## Project-Specific Hard Stops

Stop before:

- push / PR / release / deploy / tag
- release-candidate gate refresh or implementation without an exact A5 approval packet
- P51-P62 runtime completion, final RC matrix execution, mainline strict gate execution, or `RC_READY` claim without fresh evidence and separate explicit authorization
- changing `C:\Users\617\.codex\config.toml`
- switching 7605/6005 mainline in real config
- installing/updating/removing watchdog scheduled task
- modifying HKCU Run startup entry
- editing `.env`
- editing real secrets/provider keys
- dependency changes
- `rebuild-profile --confirm`
- cleanup non-dry-run/apply/confirm
- importing real VCP memory
- broad memory export
- real migration
- hard deleting data/logs/diary/indexes
- destructive commands
- writing outside workspace root
- overwriting user-owned uncommitted changes

## CMB-0012 - Red Lane remains hard stop under Smart Standing Authorization v3

Status: OPEN_RED_LANE_BOUNDARY

Area: P6-docs-drift / P10-observability-admin

Reason: Smart Standing Authorization v3 grants a bounded Amber autonomy envelope, but it does not authorize Red actions.

Required approval/action: explicit user approval remains required for push/PR/tag/release/deploy, force/history rewrite, destructive actions, secret read/edit, raw private data exposure, broad real memory scan/export, real VCP memory import/migration, wide VCPChat/VCPToolBox write, public MCP expansion, Codex/Claude config change, watchdog/startup changes, dependency changes without exact package/action list, audit-fix/batch upgrade/package-manager switch, unbounded cost/loops, overwrite without explicit allowance, non-obvious validation failure repair, and readiness/cutover/RC_READY claims.

Safe state: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`; v3 policy/status only; no real Amber action executed by CM-0672.

## CMB-0007 - Monthly plan remains local-safe until A5 approval

Status: `OPEN_AFTER_READONLY_PRECHECK`\r\n\r\nArea: P6-docs-drift / P10-observability-admin\r\n\r\nReason: `A5-RC-PRECHECK-READONLY` has executed, but recall observation, A5-GAP-6 aggregation execution, push, release, deploy, cutover, and readiness claims still require separate exact approval or fully passing A4.8 safe-push policy where applicable.

Required approval/action: prepare A5-GAP-6 evidence-only aggregation packet, separately approve `A5-RC-PRECHECK-RECALL` with subject/query/audit boundary if needed, or choose local-safe non-A5 Phase F work.

Safe state: `PRECHECK_PASSED_NOT_RC_READY` for readonly evidence, project remains `NOT_READY_BLOCKED`; no recall, aggregation execution, push, or cutover.

## CMB-0008 - RC_PRECHECK_001 A5-GAP-6 aggregation approval required

Status: `CLOSED_EXECUTED_NOT_READY`\r\n\r\nArea: P10-observability-admin / validation-aggregator\r\n\r\nResolution: exact A5-GAP-6 evidence-only aggregation approval was provided and executed for current HEAD `a1f54d6413fe0d1ee4d3ae1923b7bec4144aab9a`.

Next action: continue local-safe Phase F prep or request a separate exact approval for recall observation/cutover-related work if needed.

Safe state: aggregation evidence recorded as `EVIDENCE_AGGREGATED_NOT_RC_READY`; no recall, provider, real memory broad scan, migration/apply, config/watchdog/startup change, public MCP expansion, durable write, push, cutover, A5-GAP-7, or readiness claim.

## CMB-0009 - RC_PRECHECK_001 current-target exact approval required

Status: OPEN_TARGET_REFRESHED_NOT_APPROVED

Area: P10-observability-admin / RC_PRECHECK_001

Reason: RC precheck target/baseline has been refreshed to current local HEAD 765ab1825535c8b66078e50ff43ac519488d25f8, but no new exact A5 execution approval has been granted for this target.

Required approval/action: user must provide a new exact A5-RC-PRECHECK-READONLY approval line bound to 765ab1825535c8b66078e50ff43ac519488d25f8 before any strict gate, HTTP observe, compare, rollback, or public MCP freeze evidence capture is run. Recall path observation still requires separate exact A5-RC-PRECHECK-RECALL approval.

Safe state: NOT_READY_BLOCKED; docs/board packet refreshed only.
## CMB-0010 - RC_PRECHECK_001 target drift rule patched but execution still not approved

Status: OPEN_RULE_PATCHED_NOT_APPROVED

Area: P10-observability-admin / RC_PRECHECK_001

Reason: Runtime evidence target baseline is f4eb17173b6870dbc8ae55efe9801a62e359cac6, and metadata-only newer commits may be allowed only after clean status, lineage, and docs/board-only post-target checks. No new exact execution approval has been granted after this rule patch.

Required approval/action: provide exact A5-RC-PRECHECK-READONLY approval bound to f4eb17173b6870dbc8ae55efe9801a62e359cac6 and the metadata-only drift rule before running strict gate, HTTP observe, compare, rollback, or public MCP freeze evidence capture.

Safe state: RC_PRECHECK_001_NOT_READY; docs/board rule patch only.

## CMB-0011 - Post-precheck readiness remains blocked

Status: OPEN_NOT_READY_AFTER_PRECHECK

Area: P10-observability-admin / RC_PRECHECK_001

Reason: RC_PRECHECK_001 readonly/local evidence passed with PRECHECK_PASSED_NOT_RC_READY, but this is not RC readiness, runtime readiness, cutover readiness, or release readiness.

Required approval/action: separate exact approval remains required for recall observation, A5-GAP-6 aggregation, runtime gap closure, public MCP expansion, provider, real-memory work, migration/import/export/backup/restore apply, durable write, push/tag/release/deploy, cutover, or A5-GAP-7.

Safe state: NOT_READY_BLOCKED.
