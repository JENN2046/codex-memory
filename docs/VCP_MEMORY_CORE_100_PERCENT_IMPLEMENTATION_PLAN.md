# VCP Memory Core 100% Implementation Plan

更新时间：2026-05-09
适用项目：`codex-memory`
当前稳定版本：`v0.1.1-scope-boundary-20260508`
当前封板提交：`8c2836b`
当前定位：个人本地生产可用版，继续向 VCP 记忆核心 100% 独立主链推进

---

## 1. 这份文档是做什么的

这份文档是 `codex-memory` 的 **VCP 记忆核心 100% 落地总计划**。

它不是普通 TODO，也不是短期维护记录。

它的作用是告诉后续 Agent、Codex、Claude 和维护者：

1. 什么叫 “VCP Memory Core 100%”
2. 当前 `codex-memory` 已经做到哪里
3. 离 100% 还差什么
4. 应该按什么顺序补齐
5. 每一步怎么验证
6. 哪些动作不能自动执行
7. 什么情况下才可以宣布接近 100%

一句话：

> 这份文档是 `codex-memory` 从“个人本地生产可用”走向“完整承担 VCP 记忆核心主链”的施工总图。

---

## 2. 先定义：100% 到底是什么意思

这里的 100%，不是完整复刻整个 VCPToolBox。

`VCPToolBox` 是一个更大的生态，里面包含：

- 插件系统
- 多工具调度
- Agent 角色系统
- UI / Chat 体验
- 自动化工作流
- 远程控制
- 摄影工作室流程
- 设备与软件桥接
- 记忆、梦境、长期沉淀

而 `codex-memory` 的目标不是一次性复刻整个 VCPToolBox。

本计划里的 100%，指的是：

> **VCP 记忆核心能力 100% 独立主链。**

也就是说，让 `codex-memory` 能独立承担 VCP 记忆系统最重要的核心能力。

---

## 3. 本计划包含什么

本计划包含以下能力：

- 记忆写入
- 记忆检索
- 被动记忆召回
- 主动记忆召回
- DeepMemo / TopicMemo 兼容
- scope 隔离
- Codex / Claude MCP 接入
- SQLite shadow store
- diary 兼容
- vector / chunk index
- TagMemo
- rerank
- candidate cache
- write audit
- recall audit
- dashboard
- mainline gate
- rollback readiness
- profile migration gate
- real query suite
- 记忆生命周期治理
- proposal / tombstone / supersession
- DreamWorker proposal 模式
- MemoryReflectionWorker
- backup / restore
- 长期运行观察

---

## 4. 本计划不包含什么

本计划不等于完整复刻：

- VCPToolBox 全部插件生态
- VCPChat 完整 UI
- Agent 社交环境 UI
- 全部工具编排体验
- 多端桌面 / 移动端体验
- 公网多租户企业平台
- 商业 SaaS 后台
- 企业级合规审计系统

这些可以以后做，但不属于本计划的核心目标。

---

## 5. 当前状态

当前 `codex-memory` 已经进入个人本地生产可用阶段。

当前稳定标签：

```text
v0.1.1-scope-boundary-20260508
```

当前已经完成：

- HTTP MCP / stdio MCP
- `record_memory`
- `search_memory`
- `memory_overview`
- diary 兼容写入
- SQLite shadow store
- chunk / vector index
- write audit
- recall audit
- candidate cache
- TagMemo
- Time / Group / Rerank
- LightMemo 目录策略
- DeepMemo / TopicMemo CLI
- active memory index
- profile gate
- dashboard CLI
- mainline gate
- rollback readiness
- CI green
- scope boundary 修复
- dashboard clean CI runner 修复
- tag 封板
- `.agent_board` 状态收口

当前能力判断：

```text
个人本地生产使用：可以
小团队内测：可以谨慎试用
公网 / 多租户 / 企业级生产：暂时不要
VCP 记忆核心能力：约 75%～80%
完整 VCPToolBox 生态：不是当前目标
```

---

## 6. 当前最大缺口

### 6.1 缺真实 query 质量评估

现在很多测试证明系统：

- 能写
- 能查
- 格式对
- CI 过
- scope 不串线
- dashboard 能跑

但还需要证明：

> 查出来的结果真的好不好。

记忆系统最终不是为了“有返回”，而是为了“返回对的东西”。

所以必须建立真实 query suite。

---

### 6.2 缺真实 baseline 门禁

当前 profile / compare / rollback 已经能跑。

但如果要接近 100%，必须保留旧 profile baseline，用来证明：

- 新 profile 召回质量没有明显下降
- 新 rerank 没有造成错误排序
- 新 embedding 没有破坏关键 query
- migration 前后结果可解释

否则只能证明“当前系统能跑”，不能证明“当前系统稳定等价或更好”。

---

### 6.3 缺历史记忆 scope 治理

新写入记忆已经可以携带 scope。

但历史 memory 可能存在：

- 没有 project_id
- 没有 client_id
- 没有 workspace_id
- visibility 不完整
- retention_policy 不完整

这些不能直接粗暴回填。

必须先 dry-run，再人工判断。

---

### 6.4 缺完整记忆生命周期

成熟的记忆系统不能只会增长。

它还要知道：

- 哪些记忆已经过期
- 哪些记忆被替代
- 哪些记忆应该 tombstone
- 哪些记忆只是 proposal
- 哪些记忆可信度低
- 哪些记忆应该永久保存
- 哪些记忆只属于某个项目

一句话：

> 记忆不能只会出生，也要会衰老、归档、替换和死亡。

---

### 6.5 缺梦境 / 后台反思系统

VCP 的深层能力不只是写入和检索。

它还应该可以：

- 后台关联旧记忆
- 发现弱关联
- 形成反思
- 生成候选总结
- 等待审查
- 再沉淀为正式记忆

但这部分风险很高。

梦境系统最怕：

> 自己编故事，然后污染长期记忆。

所以第一版 DreamWorker 只能写 proposal，不能直接写 active memory。

---

### 6.6 缺长期运行观察

CI 绿，不代表长期稳定。

记忆系统必须经历时间。

至少需要观察：

- DB 是否持续健康
- dashboard 是否长期可解释
- recall audit 是否稳定
- write audit 是否稳定
- scope 是否串线
- query 质量是否下降
- 备份是否可恢复
- 是否出现记忆污染

---

## 7. 总路线图

整体路线分四个阶段：

```text
Phase 1：从 80% 到 85%
Phase 2：从 85% 到 92%
Phase 3：从 92% 到 97%
Phase 4：从 97% 到接近 100%
```

原则：

1. 不跳阶段
2. 不先做梦境
3. 不先做大重构
4. 不直接改真实历史数据
5. 不把未验证能力写成完成
6. 每一步都要能测试、能回滚、能解释

---

# Phase 1：从 80% 到 85%

目标：

> 让当前个人生产版变成真正可验收的 VCP 记忆主链基础版。

---

## P1.1 Real MCP Scope Acceptance

### 目标

建立真实 MCP scope 端到端验收脚本。

验证：

- `record_memory` 能写入 project-a
- `record_memory` 能写入 project-b
- `search_memory` 支持 `scope.strict`
- project-a 不会查到 project-b
- project-b 不会查到 project-a
- 验收过程不污染真实 data

### 新增文件

```text
src/cli/scope-acceptance.js
tests/scope-acceptance-cli.test.js
```

### 新增 npm script

```json
"scope:acceptance": "node ./src/cli/scope-acceptance.js"
```

### CLI 参数

```text
--json
--keep-temp
--project-a <id>
--project-b <id>
```

### JSON 输出示例

```json
{
  "status": "ok",
  "strictMode": true,
  "projectA": {
    "written": true,
    "found": true,
    "leakedProjectB": false
  },
  "projectB": {
    "written": true,
    "found": true,
    "leakedProjectA": false
  },
  "tempWorkspace": "...",
  "recommendation": "scope acceptance passed"
}
```

### 验收命令

```powershell
node --test tests/scope-acceptance-cli.test.js
npm run scope:acceptance -- --json
npm test
npm run gate:mainline:strict
```

### 完成标准

```text
project-a 写入成功
project-b 写入成功
project-a strict 查询不返回 project-b
project-b strict 查询不返回 project-a
JSON 报告 status=ok
无真实 data 污染
```

---

## P1.2 Scope Backfill Dry-run Report

### 目标

建立历史 memory scope 回填 dry-run 报告。

只读，不修改真实数据库。

### 新增文件

```text
src/cli/scope-backfill-dry-run.js
tests/scope-backfill-dry-run.test.js
```

### 新增 npm script

```json
"scope:backfill:dry-run": "node ./src/cli/scope-backfill-dry-run.js"
```

### 报告字段

```json
{
  "status": "ok",
  "totalRecords": 442,
  "alreadyScoped": 0,
  "missingProjectId": 0,
  "missingClientId": 0,
  "missingWorkspaceId": 0,
  "missingVisibility": 0,
  "suggestedDefaults": {
    "client_id": "codex",
    "project_id": "codex-memory",
    "visibility": "project"
  },
  "wouldUpdate": 0,
  "mutated": false
}
```

### 必须保证

```text
mutated 永远是 false
默认 dry-run
不提供 confirm
不执行真实 backfill
不执行 rebuild-shadow
不清理 data
```

### 验收命令

```powershell
node --test tests/scope-backfill-dry-run.test.js
npm run scope:backfill:dry-run -- --json
```

---

## P1.3 Real Query Suite v1

### 目标

建立真实 query suite 框架。

第一版不需要马上填满所有真实问题，但必须把结构定好。

### 新增文件

```text
benchmarks/real-query-suite/v1.json
src/cli/real-query-suite.js
tests/real-query-suite.test.js
```

### 新增 npm script

```json
"real-query-suite": "node ./src/cli/real-query-suite.js"
```

### case 结构

```json
{
  "id": "rq-001",
  "area": "scope",
  "query": "checkpoint scope isolation",
  "target": "process",
  "expected": {
    "mustContain": [],
    "mustNotContain": []
  },
  "notes": "placeholder"
}
```

### CLI 行为

- 默认只读
- 读取 suite
- 校验 schema
- 输出 case count
- 输出 invalid count
- 暂时不强制真实检索
- 为后续质量评估预留字段

### 验收命令

```powershell
node --test tests/real-query-suite.test.js
npm run real-query-suite -- --json
```

---

## P1.4 MCP Schema Contract Hardening

### 目标

防止以后改代码时把 scope schema 弄丢。

### 必须覆盖

`record_memory` 必须允许：

```text
project_id
workspace_id
client_id
visibility
task_id
conversation_id
retention_policy
```

`search_memory.scope` 必须允许：

```text
project_id
workspace_id
client_id
visibility
strict
```

并且必须保持：

```text
record_memory additionalProperties:false
search_memory additionalProperties:false
search_memory.scope additionalProperties:false
```

### 验收命令

```powershell
node --test tests/mcp-contract.test.js
node --test tests/scope-filter.test.js
npm test
```

---

## P1.5 Query Quality Report Scaffold

### 目标

建立 query quality report 结构。

第一版只做结构检查，不伪造质量分。

### 新增文件

```text
src/cli/query-quality-report.js
tests/query-quality-report.test.js
```

### 新增 npm script

```json
"query:quality": "node ./src/cli/query-quality-report.js"
```

### 输出内容

```json
{
  "status": "ok",
  "caseCount": 0,
  "runnableCount": 0,
  "placeholderCount": 0,
  "invalidCount": 0,
  "mutated": false
}
```

### 禁止

```text
不写真实记忆
不修改 data
不生成假命中率
不声称质量达标
```

### 验收命令

```powershell
node --test tests/query-quality-report.test.js
npm run query:quality -- --json --dry-run
```

---

## P1.6 Scope Backfill Policy Document

### 目标

写清历史 memory scope 回填策略。

### 新增文件

```text
docs/scope-backfill-policy.md
```

### 必须包括

1. 为什么不能直接回填真实数据
2. 历史 records 的三种策略：
   - 保持 null，只让新记忆进入 scoped 模式
   - 默认回填 `project_id=codex-memory`
   - 按来源 / tags / path / title 推断 project_id
3. 每种策略的风险
4. 推荐策略：先 dry-run，再人工确认，再小批量执行
5. rollback 方法
6. 为什么不允许自动写真实 DB

---

## P1.7 Personal Production Readiness Checklist

### 目标

为个人生产使用建立 checklist。

### 新增文件

```text
docs/personal-production-readiness.md
```

### 内容包括

1. 固定 tag：

```text
v0.1.1-scope-boundary-20260508
```

2. 必须备份：

```text
data/
logs/
dailynote/
config.env
```

3. 必须验证：

```powershell
npm test
npm run gate:mainline:strict
npm run dashboard
npm run scope:acceptance -- --json
```

4. 运行边界：

```text
仅 127.0.0.1
不公网暴露
不多租户
不处理高敏 secrets
```

5. 观察指标：

```text
write audit
recall audit
dashboard warn/error
scope leakage
DB growth
```

6. 7 天观察计划

---

## Phase 1 完成标准

当以下全部完成，Phase 1 可判定完成：

```text
P1.1 scope acceptance CLI 完成
P1.2 backfill dry-run 完成
P1.3 real query suite scaffold 完成
P1.4 schema contract hardening 完成
P1.5 query quality scaffold 完成
P1.6 backfill policy 完成
P1.7 production readiness 完成
npm test 通过
gate:mainline:strict 通过
无真实数据污染
未 push / tag / release，除非人工授权
```

完成后能力判断：

```text
VCP 记忆核心能力：约 85%
```

---

# Phase 2：从 85% 到 92%

目标：

> 让系统不只是能跑，而是更接近 VCP 原始记忆手感。

---

## P2.1 Donor Compatibility Deepening

继续收 DeepMemo / TopicMemo donor 差异。

重点：

- payload drift
- 错误语义
- 中文边界
- alias
- 空输入
- 多关键词
- topic history
- 排序 tie-breaker

### 验收命令

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
npm test
```

### 完成标准

```text
compare matched
rollback ready
core drift = 0
extended drift 可解释并记录
```

---

## P2.2 Real Query Suite 扩到 30 条

### 目标

把真实 query suite 扩到至少 30 条。

分类建议：

```text
scope 类：5 条
checkpoint 类：5 条
rollback 类：5 条
项目治理类：5 条
DeepMemo / TopicMemo 类：5 条
摄影工作流 / VCP 真实任务类：5 条
```

每条 query 都要有：

```text
id
area
query
target
mustContain
mustNotContain
notes
manualRating 字段预留
```

---

## P2.3 V8 Diagnose 质量评估入口

### 目标

让 V8 不只是诊断，而是进入质量评估。

需要记录：

- 哪些 query 因 V8 变好
- 哪些 query 没变化
- 哪些 query 变差
- 什么时候应该降权
- 什么时候应该回退普通召回

### 验收命令

```powershell
npm run v8-diagnose -- --query "[[checkpoint migration]] ::TagMemo+1.5"
npm run shadow-compare -- --query "your domain query" --json
```

---

## P2.4 Backup / Restore Runbook

### 目标

补齐个人生产使用的备份和恢复流程。

### 新增文件

```text
docs/BACKUP_RESTORE_RUNBOOK.md
```

### 必须覆盖

```text
data/
logs/
dailynote/
config.env
tag
commit hash
profile fingerprint
```

必须写清：

- 怎么备份
- 怎么恢复
- 怎么验证恢复成功
- 怎么避免覆盖新数据
- 出错怎么回滚

---

## P2.5 Dashboard Production Readiness Panel

### 目标

让 dashboard 不只显示状态，还能判断个人生产是否健康。

新增检查项：

- DB 是否存在
- records 是否增长
- recall audit 是否有记录
- bridge audit 是否有记录
- scope leakage 最近是否为 0
- watchdog recovery 是否过多
- profile 是否 ready
- CI 最新状态是否 green，若可取

---

## Phase 2 完成标准

```text
DeepMemo / TopicMemo donor 手感进一步收口
真实 query suite >= 30 条
V8 diagnose 有质量评估入口
backup / restore runbook 完成
dashboard 可判断个人生产健康
npm test 通过
gate:mainline:strict 通过
```

完成后能力判断：

```text
VCP 记忆核心能力：约 92%
```

---

# Phase 3：从 92% 到 97%

目标：

> 让记忆开始有生命周期和时间沉淀。

---

## P3.1 Memory Lifecycle CLI

新增治理 CLI：

```text
governance:report
governance:review
governance:proposal:list
governance:tombstone:dry-run
governance:supersede:dry-run
```

第一版只做 dry-run。

禁止直接改真实 DB。

---

## P3.2 Proposal Memory

### 目标

引入 proposal 记忆状态。

用途：

- 梦境候选
- 反思候选
- 不确定记忆
- 自动总结候选

proposal 不进入强召回主链，或者必须低权重进入。

---

## P3.3 Stale Memory Detection

### 目标

识别可能过期的记忆。

依据：

- updated_at 太旧
- 被新记忆替代
- 同类记忆冲突
- confidence 低
- retention_policy 短期

输出：

```json
{
  "staleCandidates": [],
  "reason": [],
  "mutated": false
}
```

---

## P3.4 Supersession / Tombstone Workflow

### 目标

建立记忆替代和封存流程。

必须支持：

- A supersedes B
- B superseded_by A
- tombstone_reason
- rollback
- audit

第一阶段只做 dry-run 和报告。

---

## P3.5 30 天运行观察

### 目标

个人生产连续运行 30 天。

每天记录：

- dashboard
- write count
- recall count
- error count
- scope leakage
- DB size
- backup status

每周生成报告：

```text
logs/weekly-memory-health-YYYY-MM-DD.md
```

---

## Phase 3 完成标准

```text
memory lifecycle dry-run 可用
proposal memory 可列出 / 可审查
stale detection 可报告
supersession / tombstone dry-run 可用
30 天运行观察完成
无严重记忆污染
无 scope 串线
```

完成后能力判断：

```text
VCP 记忆核心能力：约 97%
```

---

# Phase 4：从 97% 到接近 100%

目标：

> 让 codex-memory 真正接近 VCP 记忆核心的长期生命形态。

---

## P4.1 DreamWorker Proposal Mode

### 目标

实现梦境 / 后台关联 worker。

但第一版必须只写 proposal。

不能直接写 active memory。

行为：

- 扫描最近记忆
- 发现弱关联
- 生成 proposal
- 标记 confidence
- 标记 provenance
- 等人工 review

### 禁止

```text
不能直接写 active
不能删除原记忆
不能替代原记忆
不能高置信写入
```

---

## P4.2 MemoryReflectionWorker

### 目标

周期性总结和反思。

例如：

- 本周完成了什么
- 哪些风险反复出现
- 哪些项目有延迟
- 哪些工具经常失败
- 哪些 Agent 行为稳定
- 哪些记忆应该合并

输出仍是 proposal。

---

## P4.3 Multi-Agent Scope

### 目标

支持多个 Agent 的记忆边界。

维度：

- client_id
- agent_id
- project_id
- workspace_id
- visibility
- trust level

要防止：

- Claude 读到不该读的 Codex 临时记忆
- A 项目读到 B 项目记忆
- temporary memory 变成 permanent memory
- private memory 被 shared 检索到

---

## P4.4 Cross-Project Memory Pool

### 目标

支持跨项目共享记忆，但必须可控。

例如：

```text
摄影工作流通用经验
Codex 自动化治理经验
VCP 插件开发经验
UI 设计规范
```

共享记忆要有：

- visibility=shared
- provenance
- confidence
- source project
- review status

---

## P4.5 Memory Import / Export

### 目标

支持记忆迁移。

能力：

- export JSONL
- export markdown
- import dry-run
- duplicate detection
- conflict report
- rollback plan

第一版禁止直接覆盖真实记忆。

---

## P4.6 60～90 天无事故运行

最终接近 100% 前，必须经历时间。

标准：

```text
连续 60～90 天个人生产使用
无严重记忆污染
无 scope 串线
无不可恢复 DB 损坏
query suite 质量稳定
backup 可恢复
dashboard 可解释
CI 稳定
```

这一步不是代码能替代的。

记忆系统必须被时间洗过。

---

# 8. 统一验收标准

每个阶段都必须遵守。

## 8.1 必跑命令

```powershell
npm test
npm run gate:mainline:strict
```

## 8.2 涉及 MCP 时

```powershell
node --test tests/mcp-contract.test.js
node --test tests/mcp-http.test.js
```

## 8.3 涉及 scope 时

```powershell
node --test tests/scope-filter.test.js
npm run scope:acceptance -- --json
```

## 8.4 涉及 query quality 时

```powershell
npm run real-query-suite -- --json
npm run query:quality -- --json --dry-run
```

## 8.5 涉及 profile 时

```powershell
npm run profile-health
npm run profile-gate -- --json --summary-only
```

## 8.6 涉及 dashboard 时

```powershell
npm run dashboard
npm run dashboard -- --json
npm run dashboard -- --json --summary-only
```

---

# 9. 禁止越界事项

以下事项不能自动执行：

```text
push
tag
release
deploy
修改 .env
修改 secrets
修改全局 Codex 配置
修改 Claude 配置
删除 data/
删除 logs/
删除 dailynote/
真实 backfill
真实 cleanup
rebuild-profile --confirm
新增依赖
大规模架构重写
公网暴露服务
```

必须人工明确授权。

---

# 10. 推荐版本策略

当前稳定版：

```text
v0.1.1-scope-boundary-20260508
```

未来建议：

```text
v0.1.2-real-scope-acceptance
v0.1.3-query-suite-v1
v0.2.0-memory-governance-dry-run
v0.3.0-dreamworker-proposal
v1.0.0-vcp-memory-core-stable
```

不要轻易打 `v1.0.0`。

`v1.0.0` 必须满足：

- 真实 query suite
- baseline gate
- lifecycle governance
- backup / restore
- 30～60 天运行记录
- CI green
- scope acceptance
- no known P0/P1 bug

---

# 11. 最终 100% 判定标准

当以下条件满足时，才可以说：

> `codex-memory` 接近 VCP Memory Core 100%。

必须满足：

- 写入稳定
- 检索稳定
- scope 不串线
- DeepMemo / TopicMemo 手感接近 donor
- query suite 有真实覆盖
- V8 效果可证
- profile migration 有真实 baseline
- lifecycle governance 可 dry-run
- proposal / tombstone / supersession 可审计
- DreamWorker 只写 proposal
- backup / restore 可执行
- dashboard 可解释
- CI 长期绿
- 至少 60 天个人生产运行无严重事故

不能满足以下情况时，不能说 100%：

- 没有真实 query suite
- 没有长期运行观察
- 没有 backup / restore
- 没有 lifecycle
- 梦境系统直接污染 active memory
- scope 仍可能串线
- CI 不稳定

---

# 12. 一句话总结

`codex-memory` 当前已经能作为个人本地生产记忆主链使用。

但要到 VCP 记忆核心 100%，下一步不是盲目加功能，而是：

> 用真实 query、真实 baseline、真实治理、真实时间，把“能用的记忆系统”磨成“可信的长期记忆主链”。

骨架已经站起来了。

接下来要长年轮。
