# Phase E Daily Self-Check

更新时间：2026-05-05

这份文档是 `Phase E / P0-1 持续门禁常态化` 的日常入口。

目标很简单：回到项目时，不需要翻 README 长文或历史灰度记录，也能知道今天该先跑什么、失败时先看哪里、什么时候升级到严格门禁。

## 最小日常检查

```powershell
cd A:\codex-memory
git status --short
npm run gate:mainline
```

通过口径：

- `git status --short` 为空
- `gate:mainline` 返回 `status: ok`
- health 为 `200`
- compare 全部 matched
- rollback 全部 rollback-ready

当前标准 suite 基线：

- compare：`36/36 matched`
- rollback：`36/36 rollback-ready`
- 最新 suite 收口记录：[phase-e-standard-suite-expansion-08.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-08.md)
- 最新 gate 复核记录：[phase-e-mainline-gate-checkpoint-12.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-12.md)
- 运行记录索引：[PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)

## 什么时候跑严格门禁

普通文档补链、日志、handoff 或状态摘要更新，通常跑 `gate:mainline` 就够。

下面这些改动要升级到严格门禁：

- MCP 工具契约变更
- HTTP MCP 启动链、health、watchdog 或 observe 行为变更
- active-memory / DeepMemo / TopicMemo 行为变更
- compare / rollback harness 变更
- recall 主链、排序、rerank、候选过滤或 fixture suite 变更

严格门禁：

```powershell
cd A:\codex-memory
npm run gate:mainline:strict
```

## gate 失败时先看什么

按这个顺序缩小范围：

1. `health`
   - 先确认 `http://127.0.0.1:7605/health` 是否可达。
   - 如果不可达，先看 HTTP MCP 是否启动，再考虑 `npm run start:http:ensure`。
2. `compare`
   - 如果 compare 失败，先确认是 core mismatch 还是 extended drift。
   - core mismatch 优先级更高，通常表示 donor 兼容行为有变。
3. `rollback`
   - 如果 rollback 不 ready，先看 blocker / recommendation 摘要。
   - 不要直接改回滚配置；先用只读报告定位原因。

需要更细诊断时：

```powershell
npm run observe:http -- --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

## 不要作为日常自检自动执行的命令

这些命令会写本地状态、启动项或 profile/index 生成物，需要单独确认：

- `npm run rebuild-shadow`
- `npm run rebuild-profile -- --confirm --json`
- `npm run cleanup-legacy-chunks -- --confirm`
- `npm run start:http:install-task`
- `npm run start:http:watchdog:install`

日常优先用 dry-run、只读报告和 gate。

## 记录结果

如果这次检查只是普通日常确认，可以不新建日志。

如果这次检查发生在文档基线、运行态修复、MCP 契约变更、active-memory 行为变更或回滚演练之后，建议补一条 `logs/phase-e-*.md` 检查点，至少写清：

- 时间
- 分支和工作区状态
- 跑了哪些命令
- health / compare / rollback 结果
- 未验证项
- 下一步

## 当前参考记录

- 运行记录索引：[PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)
- 最新独立主线 gate 检查点：[phase-e-mainline-gate-checkpoint-12.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-12.md)
- 最新 suite 扩容记录：[phase-e-standard-suite-expansion-08.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-08.md)

## 一句话结论

日常回到项目先跑 `git status --short` 和 `npm run gate:mainline`；只有触达 MCP / HTTP / active-memory / compare / rollback / recall 主链时，才升级到 `npm run gate:mainline:strict`。
