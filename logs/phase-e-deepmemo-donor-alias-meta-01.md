# Phase E / P1 DeepMemo donor alias meta

## 背景

`DeepMemo` 的错误 meta 已经能带出核心诊断，但 donor 风格的 `snake_case` 别名还不完整。

## 这次收口

- `src/cli/deepmemo.js`
  - 补齐 `maidName`
  - 补齐 `agent_id`
  - 补齐 `rawKeyword / raw_keyword`
  - 补齐 `blocked_keyword_count`
  - 补齐 `effective_keyword_count`
  - 补齐 `effective_keyword_text`
- `tests/vcp-active-memory-cli.test.js`
  - `all-keywords-blocked` 回归校验这些别名字段
  - 新增 `agent-not-found` 回归

## 验证

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `10/10`

## 结果

`DeepMemo` 的错误 meta 现在更接近 donor 原始字段风格了，但主错误包络仍保持兼容：

- `status`
- `error`
- `result`
- `meta`
