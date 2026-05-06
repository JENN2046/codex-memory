# Phase E Summary

更新时间：2026-05-06

## 一句话结论

`Phase E` 已经把 `codex-memory` 从“Phase D 切成默认主链后可继续使用”，推进到“有日常门禁、有运行态诊断、有回滚预案、有 donor 风格精修基线”的阶段，并已进入正式收官状态。

`P0` 主线能力已经落地并可日常使用，`P1` 的高价值 donor 精修也已经收住主体，`P2` 的文档导航和 provider 留档入口也已补齐。当前没有 Phase E open blocker。

最终收官说明：[PHASE_E_FINAL_CLOSEOUT.md](/A:/codex-memory/PHASE_E_FINAL_CLOSEOUT.md)

## 阶段目标

`Phase E` 的目标不是再证明“能不能独立出来”，而是：

- 让默认主链进入可持续运维状态
- 让 donor 风格兼容从“功能能跑”推进到“手感更像”
- 让 compare / rollback / observe / rollback drill 成为仓库内可复用资产

## 已完成

### P0 主线能力

- 默认主链持续门禁已落地：
  - `npm run gate:mainline`
  - `npm run gate:mainline:strict`
- HTTP MCP 运行态诊断已落地：
  - `npm run observe:http`
- 默认主链回滚预案已落地：
  - `npm run rollback:mainline:plan`
- donor 回滚目标已自动发现、已可达、已完成一次真实回滚演练并切回主链

### P1 donor 精修

- 扩展字段 drift 已收口到零：
  - 标准 suite compare `extendedMismatchCountTotal = 0`
  - 标准 suite rollback `extendedMismatchCountTotal = 0`
- `DeepMemo` 排序 tie-breaker 已补成稳定回归链：
  - same-topic：更靠后的命中窗口优先
  - cross-topic：更紧凑窗口优先
  - cross-topic：更 fresher 的 topic 优先
  - 冲突优先级：`compactness > freshness`
  - 最末级兜底：`lexical topicId`
- `TopicMemo` 错误语义与路由边界已明显贴近 donor：
  - `topic_id/topicId` 未显式写 `command` 时会自动推断为 `GetTopicContent`
  - `agent-not-found`
  - `topic-not-found`
  - `missing-history`
  - `empty-history`
  - `history-read-error`
  - `GetTopicContent -> agent-not-found` 已进入标准 suite
- `DeepMemo` 错误 `meta` 也已往 donor 原始字段收了一层：
  - `maidName`
  - `agent_id`
  - `query / rawQuery / raw_query`
  - `rawKeyword / raw_keyword`
  - `blocked_keyword_count`
  - `effective_keyword_count`
  - `effective_keyword_text`
- donor 风格错误语义现已进入标准 active-memory suite 和 compare / rollback 门禁，不再只停留在 CLI 单测
- 标准 suite 现在还新增了 `DeepMemo invalid-json`，把 `inputSource / rawInputPreview` 这批错误诊断也推进进门禁
- 标准 suite 现在还新增了 `TopicMemo invalid-json`，让两条主动记忆 CLI 的输入错误门禁更对称
- 标准 suite 现在还新增了 `TopicMemo unknown-command`，把显式错误指令的 donor 语义也收进了仓库门禁
- 标准 suite 现在还新增了 `DeepMemo` 多关键词组合 `all-keywords-blocked`，把 blocked/effective 组合诊断也推进进门禁
- compare harness 现在还会在新旧 success payload 都显式暴露 `meta` 时，额外比较 blocked/effective 这批 success-meta 字段
- 标准 suite 现在还新增了 `DeepMemo` 多关键词组合“部分屏蔽但仍成功”，把 success-path 的 blocked/effective donor 诊断也推进进门禁
- 标准 suite 现在还新增了 `DeepMemo` 重复关键词去重 success case，把 blocked/effective 的去重与顺序稳定性也推进进门禁
- 标准 suite 现在还新增了 `DeepMemo` 高级查询语法混用 success case，把短语 / 可选组 / 权重项混用时的 blocked/effective donor 语义也推进进门禁
- 标准 suite 现在还新增了 `DeepMemo` blocked 配置重复值和大小写混用 success case，把 blocked config 归一化下的 blocked/effective donor 语义也推进进门禁
- 标准 suite 现在还新增了 `TopicMemo GetTopicContent agentId/topicId alias` success case，把多 agent alias 下的内容取回路径也推进进门禁
- 标准 suite 现在还新增了 `DeepMemo` `key_word / KeyWord` 错误路径 alias case，把 missing-maid 与 agent-not-found 的 keyword 诊断别名推进进门禁

## 当前基线

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `17/17`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js`
  - `14/14`
- `node --test .\tests\rollback-active-memory-cli.test.js`
  - `11/11`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount = 39`
  - `extendedMismatchCountTotal = 0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount = 39`
  - `extendedMismatchCountTotal = 0`
- `npm test`
  - `123/123`

## 阶段产出

`Phase E` 现在已经沉淀出一组可持续复用的主线资产：

- 门禁：
  - `mainline-gate`
- 观察：
  - `http-observe`
- 回滚：
  - `mainline-rollback`
  - donor 回滚演练记录
- donor 对照：
  - 标准 active-memory suite
  - compare / rollback suite 门禁
- donor 精修基线：
  - 排序 tie-breaker 回归
  - 错误语义 / 诊断输出回归

## 维护期方向

下面这些工作以后仍可继续做，但不再作为 Phase E 未完成项：

- 标准 suite 继续扩容
- donor 别名字段继续做边角 polish
- 文档导航和长期维护入口继续压缩整理
- provider / benchmark 资产继续沉淀
  - 当前已有轻量留档入口：[PHASE_E_PROVIDER_BENCHMARK.md](/A:/codex-memory/PHASE_E_PROVIDER_BENCHMARK.md)
  - 当前已有 reports 索引：[benchmarks/reports/README.md](/A:/codex-memory/benchmarks/reports/README.md)
  - 当前已有脱敏记录模板：[phase-e-provider-benchmark-record-template.md](/A:/codex-memory/logs/phase-e-provider-benchmark-record-template.md)

## 结论

`Phase E` 已经完成“默认主链稳定化 + 高价值 donor 精修 + 可维护入口收口”的主体目标。

如果现在停在当前基线，项目已经处于一个健康、可守门、可回滚、可继续演进的状态。后面继续推进时，更适合按维护期增量任务推进，而不是再回到大规模兼容迁移模式。
