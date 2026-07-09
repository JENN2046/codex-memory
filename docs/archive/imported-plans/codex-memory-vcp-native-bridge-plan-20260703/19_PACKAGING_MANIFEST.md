# Packaging Manifest

## Package name

`codex-memory-vcp-native-bridge-plan-20260703`

## Included files

| File | Purpose |
|---|---|
| `00_INDEX.md` | 总索引，说明如何阅读和使用本包 |
| `01_REPOSITORY_REALITY_CALIBRATION.md` | 仓库现实校准、HEAD、状态、漂移、证据等级 |
| `02_EXECUTIVE_DECISION.md` | 最终路线判断和立即建议 |
| `03_FINAL_IMPLEMENTATION_GOAL.md` | 新方针下的正式实现目标 |
| `04_ARCHITECTURE_DIRECTION.md` | VCPToolBox / codex-memory / Codex / Claude 职责边界 |
| `05_APPROVAL_AND_AUTONOMY_MODEL.md` | L0-L3 自动、L4 硬停、Jenn 边界授权 |
| `06_MASTER_PLAN.md` | 总体阶段路线、依赖、里程碑 |
| `07_PHASE_PLANS.md` | M0-M15 阶段计划 |
| `08_TASKBOOKS_M0_M3.md` | 可直接执行的 M0-M3 完整任务书 |
| `09_KEY_TASK_DRAFTS_M4_M8.md` | M4-M8 关键任务草案 |
| `10_FUTURE_PHASES_M9_M15.md` | M9-M15 远期阶段进入/退出条件 |
| `11_VALIDATION_STRATEGY.md` | 测试、dry-run、live exact-approved、release gate 策略 |
| `12_DOCUMENTATION_UPDATE_PLAN.md` | README / STATUS / CURRENT_STATE / roadmap / taskbook 同步计划 |
| `13_RISK_REGISTER.md` | P0/P1/P2 风险与缓解措施 |
| `14_SELF_REVIEW.md` | Pro 对计划的自审查与修正记录 |
| `15_ROUNDTABLE_REVIEW.md` | 多角色圆桌会议审查与辩论 |
| `16_FINAL_FROZEN_RECOMMENDATION.md` | 最终冻结建议 |
| `17_FIRST_THREE_EXECUTABLE_TASKS.md` | 最先执行的 3 个任务书 |
| `18_EVIDENCE_MAP.md` | 关键判断与证据来源映射 |
| `19_PACKAGING_MANIFEST.md` | 打包清单、文件说明、完整性说明 |
| `20_PACKAGING_RECEIPT.md` | 打包完成回执、生成时间、限制、缺口 |

## Artifact format

- Directory: markdown files.
- Zip: `.zip` archive.
- Encoding: UTF-8.
- Content type: planning documentation only.

## Integrity notes

- Package does not contain repository source files.
- Package does not contain secrets, runtime state, `.env`, credentials, tokens, cookies, or raw private memory.
- Package does not contain implementation code.
- SHA-256 of zip is recorded in `20_PACKAGING_RECEIPT.md`.

## Delivery checklist

```yaml
delivery_checklist:
  index_present: true
  manifest_present: true
  receipt_present: true
  evidence_map_present: true
  taskbooks_present: true
  phase_plans_present: true
  self_review_present: true
  roundtable_present: true
  no_repo_modification: true
  no_live_vcp_call: true
  no_release_artifact: true
```
