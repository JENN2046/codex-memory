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
| CMB-0013 | open | dirty-worktree-proof-baseline | P0-mainline-health / P4-http-runtime | CM-0903 future recall proof execution | CM-0903 binds the exact `CM-0814` query-family basis, but the worktree was dirty before the packet and includes source/test/runtime-surface drift, so it cannot be treated as clean executable recall proof baseline evidence | Re-run fresh Git/runtime preflight and bind clean current branch/head/worktree facts before any future live recall proof; use CM-0906 current-facts CLI and CM-0905 fixture CLI as preflight review only; fail closed if dirty, stale, ambiguous, or source-drifted | 2026-05-24 |
| CMB-0014 | open | dirty-worktree-write-proof-baseline | P0-mainline-health / P8-memory-governance | CM-0907 / CM-0908 / CM-1009 future write proof execution | CM-0907 binds an explicit `CM-0737` write proof execution preflight and CM-0908 can collect current local Git facts, but repository reality is dirty during CM-1009 and preflight readiness is now explicitly preflight-only with no implicit write authorization, so it cannot be treated as clean executable write proof baseline evidence | Re-run fresh Git/runtime preflight and bind clean current branch/head/worktree facts before any future live write proof; use CM-0908 current-facts CLI and CM-0907 fixture CLI as preflight review only; require separate exact live-write approval and fail closed if dirty, stale, ambiguous, source-drifted, or missing exact basis/seam/scope/boundary input | 2026-05-24 |

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
