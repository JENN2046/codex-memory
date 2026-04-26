# Phase E standard suite expansion 01

## 背景

标准 active-memory suite 已经能守住大部分 donor 风格边界，但此前还缺一条高价值的输入错误样本：

- `DeepMemo invalid-json`

这条样本会直接覆盖 donor 风格错误诊断里的：

- `code=invalid-json`
- `inputSource`
- `rawInputPreview`

## 这次扩容

- 新增标准 case：
  - `deepmemo-invalid-json`
- 新增输入文件：
  - `benchmarks/active-memory-suite/inputs/deepmemo-invalid-json.txt`
- 新增专用 legacy script：
  - `benchmarks/active-memory-suite/legacy/deepmemo-invalid-json-legacy.js`

选择独立 legacy script，而不是继续扩 `standard-legacy-runner.js` 的 malformed-input 分支，是为了把这刀控制成最小扰动：

- 不影响现有 standard runner 的正常 JSON 路径
- 直接把 donor 风格 `invalid-json` 错误包络推进进 compare / rollback 门禁

## 验证

- `node --test .\tests\compare-vcp-active-memory-cli.test.js`
  - `14/14`
- `node --test .\tests\rollback-active-memory-cli.test.js`
  - `11/11`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount=27`
  - `extendedMismatchCountTotal=0`
- `npm test`
  - `99/99`

## 结果

- 标准 suite 已从 `26` 个 case 扩到 `27` 个 case
- `DeepMemo invalid-json` 现在不只是在 CLI 单测里正确，也已经进入 compare / rollback 门禁
- 这批 donor 风格错误诊断字段已具备仓库级持续守门能力
