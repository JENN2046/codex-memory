# Phase E / P1 error semantics standard suite gate

## 背景

`DeepMemo / TopicMemo` 的 donor 风格错误语义之前已经有 CLI 单测覆盖，但还没有真正进到仓库标准 active-memory suite 和 compare / rollback 门禁里。

这意味着：

- 实现层已经贴近 donor
- 但迁移门禁还不能直接守住这批错误语义

## 这次收口

- `src/cli/compare-vcp-active-memory.js`
  - 把 `query / rawQuery / blockedKeywords / inputSource` 这一批字段收窄成 `error` case 专属 extended diff
  - 保留 success path 原有的 compare 语义，不把 donor 错误诊断字段外溢到成功路径
- `benchmarks/active-memory-suite/standard-suite.json`
  - 新增 `topicmemo-gettopiccontent-history-read-error`
- `benchmarks/active-memory-suite/vchat-fixture-history-read-error/*`
  - 新增独立 fixture 和 manifest
- `benchmarks/active-memory-suite/legacy/standard-legacy-runner.js`
  - `history-read-error` 改为读取真实坏掉的 `history.json`
  - 使用当前 Node 运行时的 parser message 生成 donor 文案，避免固定旧版本错误字符串
- `tests/compare-vcp-active-memory-cli.test.js`
  - donor-style error ad-hoc legacy script 现在补齐 `meta`

## 验证

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `10/10`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js`
  - `14/14`
- `node --test .\tests\rollback-active-memory-cli.test.js`
  - `11/11`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount=26`
  - `extendedMismatchCountTotal=0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount=26`
  - `extendedMismatchCountTotal=0`
- `npm test`
  - `99/99`

## 结果

- donor 风格错误语义现在不只是在 CLI 单测里正确，也已经进入标准 suite 和 compare / rollback 门禁
- `TopicMemo history-read-error` 现在有独立 fixture、标准 case、legacy 对照和 gate 验证
- compare / rollback 再次回到全绿状态，可以把当前实现作为 `Phase E / P1` 的稳定基线
