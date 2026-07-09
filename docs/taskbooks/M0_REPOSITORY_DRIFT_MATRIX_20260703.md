# M0 Repository Drift Matrix

Task id: `CM-M0-T2-DRIFT-MATRIX`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Evidence type: `docs-only`, `read-only calibration`, `no-runtime`

## Purpose

This matrix identifies the documentation and status drift that must be resolved
before the VCP-native bridge plan can be treated as the active project route.

It is evidence for M1/M2 only. It does not authorize live VCPToolBox runtime
inspection, memory reads/writes, approval-line generation, provider/API calls,
public MCP expansion, push, release, deploy, cutover, or readiness claims.

## Drift Matrix

| Surface | Observed state | Drift / risk | Required next action |
|---|---|---|---|
| Git baseline | Plan package baseline is `origin/main@93359a8c`; local `HEAD` is `62a2f9ac` and ahead 1 because the archive package was committed locally | The executor must not reuse the package's baseline as current local HEAD | M0 snapshot records fresh Git facts; future branch/remote-sensitive work must re-run fresh Git commands |
| `README.md` positioning | Describes `codex-memory` as an independent `vcp_codex_memory` implementation that does not rely on `VCPToolBox` runtime | Conflicts with the new user goal: VCPToolBox-native-first governed bridge, with local memory as fallback/test substrate | M2-T1 should update README positioning without claiming runtime capability |
| `docs/VCP_MEMORY_PARITY_ROADMAP.md` | Marks practical parity route as long-form roadmap, current `P16` TagMemo / semantic association parity planning | Older local-parity direction can be misread as primary after the VCP-native bridge pivot | M1 should freeze the strategy pivot; M2 should reclassify this roadmap as fallback/reference unless a later task supersedes it |
| `docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md` | Aligns with VCPToolBox-native governed bridge and strict non-authorization boundary | No drift found; it is still vision/routing only, not runtime proof | M1 can cite it as the north-star source, while preserving its non-authorization language |
| `.agent_board/CURRENT_FACTS.json` | Latest committed snapshot says `CM-1713` / `CMV-1816` and scoped `READY` / `RC_READY`, with explicit not-release/not-production/not-deploy/not-cutover flags | It is more current than the human status surfaces; scoped `READY` language must not be expanded into bridge/runtime readiness | M2-T2 should keep latest validation facts while clarifying bridge plan status and non-readiness boundaries |
| `.agent_board/VALIDATION_LOG.md` | Latest validation is `CMV-1816`, fixture-only approval request display/request boundary, no approval line and no runtime | Current validation surface is aligned with CM-1713 but contains historical ColaMeta validation evidence | M1 should record that future plan execution is repo-native and no longer ColaMeta-driven; historical facts remain evidence only |
| `STATUS.md` | Active block still says `CM-1700` / `CMV-1805` | Stale relative to `CURRENT_FACTS.json` and `VALIDATION_LOG.md` | M2-T2 should update the active block and current summary |
| `CURRENT_STATE.md` | Snapshot still says `CM-1700` / `CMV-1805` | Stale relative to `CURRENT_FACTS.json` and `VALIDATION_LOG.md` | M2-T2 should update the entrypoint to the current bridge-plan route |
| `.agent_board/TASK_QUEUE.md` | Active header still says latest active task `CM-1700` / `CMV-1805`; visible rows start at CM-1700 | Stale active task header can route future work back to pre-v1.12 boundary work | M2-T2 should add/route the M0-M2 plan tasks and refresh the active header |
| Imported plan package | Archived under `docs/archive/imported-plans/...` with receipt saying planning material only | Correct as archive, but insufficient as active task route by itself | M1 should create the active strategy decision record; M2 should link active docs/state surfaces to it |
| Live VCPToolBox capability | Not proven in current local M0; package marks exact target/transport/result shape unresolved | Any implementation claim beyond docs/fixtures would overclaim | Defer to later exact-approved phases; prepare only approval/inspection boundaries until explicit approval exists |

## M0 Conclusion

The repository can proceed to M1/M2, but only as docs/state synchronization and
strategy-pivot work.

Current safe continuation:

- `M1-T1 Strategy Pivot Decision Record`
- `M2-T1 README Positioning Synchronization`
- `M2-T2 STATUS CURRENT_STATE TASK_QUEUE Synchronization`

Current unsafe continuation:

- live VCPToolBox runtime inspection;
- broad VCP memory scan/export/import/migration/sync/backfill;
- approval-line creation, validation, submission, issue, storage, or simulation;
- secrets, `.env`, `config.env`, provider/auth configuration, raw memory, raw
  runtime state, or raw audit reads;
- provider/API calls;
- durable memory writes;
- public MCP expansion;
- push, release, deploy, cutover, or readiness claims.
