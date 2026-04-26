# Phase E / P1 DeepMemo query alias meta

## 背景

`DeepMemo` 的错误 meta 还少一层和成功态一致的 query 别名。

## 这次收口

- `src/cli/deepmemo.js`
  - 补齐 `query`
  - 补齐 `rawQuery`
  - 补齐 `raw_query`
- `tests/vcp-active-memory-cli.test.js`
  - `all-keywords-blocked` 回归校验 `query` 别名
  - `agent-not-found` 回归校验 `query` 别名

## 验证

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `10/10`

## 结果

`DeepMemo` 的错误 meta 现在同时具备：

- `keyword` 语义
- `query` 语义
- camelCase 与 snake_case 别名

这层已经基本贴近 donor 排障时能直接看懂的字段集合了。
