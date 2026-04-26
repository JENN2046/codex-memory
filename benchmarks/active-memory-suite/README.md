# Active-Memory Standard Suite

这套标准数据集用于仓库内可复用的 `active-memory` compare / rollback 回归，不再依赖临时生成的 case。

## 目录说明

- 标准 fixture root 的命名约定固定为：`vchat-fixture*`
- `vchat-fixture/`：固定的 donor-style VChat 数据
- `vchat-fixture-no-settings/`：去掉 `settings.json` 的备用 fixture，用于验证默认用户名回退到 `主人`
- `vchat-fixture-multi-agent/`：同一 root 下多 agent 的 fixture，用于验证 agent 选择和多 maid 输出
- `vchat-fixture-ranking/`：单 topic 多窗口复杂排序的 fixture，用于验证更细的 `DeepMemo` 排序手感
- `vchat-fixture-ranking-extended/`：单 topic 三窗口排序 fixture，用于验证更大的窗口排序稳定性
- `vchat-fixture-multi-topic-large/`：更大的跨多 topic 排序 fixture，用于验证多条 topic 顺序稳定性
- `inputs/`：标准输入 JSON
- `legacy/`：仓库内基线 runner
- `standard-suite.json`：compare / rollback 共用的标准 suite
- `.codex-fixture-manifest.json`：可选的 fixture 时间戳清单；suite 运行时会复制 fixture 到临时目录并按清单重打固定 `mtime`

## 元数据约定

- 标准 suite 根级现在带：
  - `metaVersion`
  - `metaSchema`
- 每个 case 现在都带 `meta`，当前固定字段为：
  - `category`
  - `expectation`
  - `fixture`
  - `tags`
- `category` 当前允许值：
  - `input-validation`
  - `query-semantics`
  - `filtering`
  - `fallback`
  - `ordering`
  - `agent-selection`
  - `topic-navigation`
  - `topic-state`
- `expectation` 当前允许值：
  - `success`
  - `error`

## 设计原则

- `DeepMemo` 的静态成功/失败结果保存在 `legacy/expected-results.json`
- `TopicMemo` 的基线结果由 `legacy/standard-legacy-runner.js` 直接根据 fixture 推导
- `TopicMemo` 之所以走动态推导，是为了让创建时间格式跟当前环境保持一致，避免文件时间和本地时区把 suite 跑偏

## 当前标准 case

当前标准集一共 `34` 个 case，覆盖：

- `DeepMemo` 无效 JSON 输入
- `TopicMemo` 无效 JSON 输入
- `TopicMemo` 未知指令
- `DeepMemo` 缺 `maid`
- `DeepMemo` 基础成功检索
- `DeepMemo` 高级查询语法成功检索
- `DeepMemo` blocked-keyword 过滤后成功检索
- `DeepMemo` 多关键词组合后部分被屏蔽但仍成功检索
- `DeepMemo` 重复关键词去重后仍成功检索
- `DeepMemo` 高级查询语法混用后仍成功检索
- `DeepMemo` blocked 配置重复值和大小写混用后仍成功检索
- `DeepMemo` 全关键词被屏蔽
- `DeepMemo` 多关键词组合后全被屏蔽
- `DeepMemo` rerank 失败后回退成功
- `DeepMemo` 多 topic 排序
- `DeepMemo` 多 agent / 多 fixture 成功检索
- `DeepMemo` 多 agent 默认 `exclude_latest`
- `DeepMemo` 多 agent `current_topic_id` 显式排除
- `DeepMemo` maid alias 命中
- `DeepMemo` 单 topic 多窗口复杂排序
- `DeepMemo` 单 topic 三窗口排序稳定性
- `DeepMemo` 更大的跨多 topic 排序集
- `DeepMemo` `agent-not-found`
- `TopicMemo` `agent-not-found`
- `TopicMemo` 多 agent `ListTopics`
- `TopicMemo` `agentId + maid` 混合过滤
- `TopicMemo` 多 agent `GetTopicContent`
- `TopicMemo` 默认 `ListTopics`
- `TopicMemo` 基础 `GetTopicContent`
- `TopicMemo` `settings.userName` 缺失时回退到 `主人`
- `TopicMemo` 空历史
- `TopicMemo` 缺失历史文件
- `TopicMemo` 历史文件读取失败
- `TopicMemo` 缺失话题

## Suite 字段补充

标准 suite 当前支持这些字段：

- `metaVersion`
- `metaSchema`
- `tool`
- `input` / `inputFile`
- `legacyScript`
- `newScript`
- `cwd`
- `timeoutMs`
- `env`
- `meta`

`meta` 当前固定字段为：

- `category`
- `expectation`
- `fixture`
- `tags`

其中 `env` 会按 case 注入到新 CLI 和仓库内 legacy runner，适合表达：

- blocked-keyword
- rerank fallback
- 切换到备用 fixture root
- 其他需要临时配置才能复现的 donor 边界

补充说明：

- `env` 里以 `_PATH` / `_ROOT` / `_DIR` 结尾的键，如果写的是相对路径，会自动按 suite 文件所在目录解析
- `topicmemo-gettopiccontent-no-settings-fallback` 就是通过 `CODEX_MEMORY_ACTIVE_MEMORY_ROOT=./vchat-fixture-no-settings` 复用这条能力
- 默认主 fixture 的 case 现在也显式声明 `CODEX_MEMORY_ACTIVE_MEMORY_ROOT=./vchat-fixture`，所以整套标准集可以脱离父进程 root env 单独运行
- 如果 fixture root 下存在 `.codex-fixture-manifest.json`，compare / rollback 会先复制到临时目录，再把 manifest 里的文件时间戳打成固定值
- 这条机制当前主要用于稳住多 topic / 多 agent 排序，避免仓库 checkout 时间或跨机器文件系统差异把标准集顺序跑偏
- 当前仓库内 `6` 个标准 fixture root 都已 manifest 化，不再依赖仓库中文件原始 `mtime`
- 仓库回归现在还会检查：
  - 标准 suite 里引用的 fixture root 必须位于 `benchmarks/active-memory-suite` 下，且目录名必须以 `vchat-fixture` 开头
  - 每个 `vchat-fixture*` 根目录都必须有 manifest
  - 每个 fixture 里的每个 `history.json` 都必须被 manifest 精确覆盖

## 推荐用法

```powershell
cd A:\codex-memory
$env:CODEX_MEMORY_BASE_PATH = "A:\codex-memory\.tmp\active-memory-suite"
$env:CODEX_MEMORY_DATA_DIR = "data"
$env:CODEX_MEMORY_LOGS_DIR = "logs"
$env:CODEX_MEMORY_ACTIVE_MEMORY_ROOT = "A:\codex-memory\benchmarks\active-memory-suite\vchat-fixture"
$env:CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS = "0"

npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering --json --require-match
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering,agent-selection --json --require-match
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --expectation error --json --require-match
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --expectation error,success --json --require-match
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --tool topicmemo --json --require-match
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --fixture vchat-fixture-multi-agent --json --require-match
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --tag window-order --json --require-match
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --tag-all alias,multi-agent --json --require-match
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --exclude-tag multi-agent --json --require-match
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --exclude-fixture vchat-fixture-no-settings --json --require-match
```

compare / rollback 的 suite 输出当前还会额外包含：

- `metaVersion`
- `metaSchema`
- `cases[*].meta`
- `categoryAggregate`
- `categoryFilter`
- `expectationFilter`
- `toolFilter`
- `fixtureFilter`
- `tagFilter`
- `tagAllFilter`
- `excludeTagFilter`
- `excludeFixtureFilter`

其中 `categoryAggregate` 会按 `meta.category` 聚合：

- `totalCaseCount`
- `matchedCaseCount` / `mismatchedCaseCount`
- `readyCaseCount` / `notReadyCaseCount`
- `coreMismatchCountTotal` / `extendedMismatchCountTotal`
- `expectedSuccessCaseCount` / `expectedErrorCaseCount`
- `fixtures`
- `caseNames`
- `fixtureAggregate`

其中 `fixtureAggregate` 会继续按 `meta.fixture` 下钻：

- `fixture`
- `totalCaseCount`
- `matchedCaseCount` / `mismatchedCaseCount`
- `readyCaseCount` / `notReadyCaseCount`
- `coreMismatchCountTotal` / `extendedMismatchCountTotal`
- `caseNames`

当前 suite CLI 过滤能力：

- `--category <meta.category>[,<meta.category>...]`（支持逗号分隔 OR）
- `--expectation <meta.expectation>[,<meta.expectation>...]`（支持逗号分隔 OR）
- `--tool <deepmemo|topicmemo>`
- `--fixture <meta.fixture>`
- `--tag <meta.tags item>`
- `--tag-all <meta.tags item list>`
- `--exclude-tag <meta.tags item list>`
- `--exclude-fixture <meta.fixture list>`
- `--expectation / --fixture / --tag / --tag-all / --exclude-tag / --exclude-fixture / --tool` 支持逗号分隔 OR 匹配
- `--category` 也支持逗号分隔 OR 匹配
