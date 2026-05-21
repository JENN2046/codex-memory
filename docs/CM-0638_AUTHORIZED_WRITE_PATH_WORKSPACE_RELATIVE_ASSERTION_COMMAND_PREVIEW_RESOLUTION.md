# CM-0638 Authorized Write-Path Workspace-Relative Assertion Command Preview Resolution

Status: COMPLETED_VALIDATED
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-21

## Purpose

`CM-0632` 和 `CM-0633` 已经让当前 governance-only chain 能显式记账输入 provenance，`CM-0628` 也已经暴露了 `commandPreviewBundle`。

但在显式 assertion-record 输入已经存在的情况下，当前 command preview 仍然要求 operator 从占位符手工替换真实路径，自动化复用价值还不够高。

这一步把当前显式 assertion-record 输入再推进一层：

- 如果输入文件位于当前 workspace 内
- 则 `commandPreviewBundle` 直接输出 workspace-relative command preview
- 如果输入文件不在 workspace 内，或没有显式输入
- 则继续 fail-closed，保留 placeholder-only 行为

## What Changed

- `ExternalTokenMaterialAssertionRecordAdapter` 现在为显式 assertion-record 输入额外生成：
  - `assertionRecordInputTrace.sourceWorkspaceRelativePath`
- `AuthorizedWritePathAutoAuthorizationPreflight` 现在为 `commandPreviewBundle` 额外生成：
  - `resolvedAssertionRecordPathMode`
  - `resolvedAssertionRecordPath`
- 当 `sourceWorkspaceRelativePath` 可用时，以下 preview command 会自动改写成 workspace-relative 路径版本：
  - `primaryCommand`
  - `helperCommand`
  - `governanceReportCommand`
  - `dashboardCommand`
  - `httpObserveCommand`
- 当显式 assertion-record 不存在，或来源路径不在 workspace 内时：
  - `resolvedAssertionRecordPathMode = placeholder_only`
  - preview command 保持原来的 placeholder 形式

## Result

当前 governance-only chain 现在不仅知道“这次结果来自哪份 assertion record”，还会在条件满足时直接给出可复制的 workspace-relative review command。

这意味着未来 token material 真正独立进入当前 session 后：

- operator 不需要再手工替换 `<CM0611_assertion_record_path>`
- normal read-only control surfaces 与 helper CLI 会给出同一套路径已解析的 review command
- 同时仍然不会泄露 workspace 外路径，也不会放宽默认 blocked 路径

## Boundaries Preserved

- 不证明 token 已存在
- 不接受新的 external assertion
- 不签发 approval
- 不执行 `CM-0601`
- 不自动授权 `CM-0595`
- 不执行 `record_memory`
- 不执行 `search_memory`
- 不调用 provider
- 不读 `.jsonl`
- 不改变 `RC_NOT_READY_BLOCKED`

## Validation

- `node --check .\src\core\ExternalTokenMaterialAssertionRecordAdapter.js`
- `node --check .\src\core\AuthorizedWritePathAutoAuthorizationPreflight.js`
- `node --test .\tests\authorized-write-path-auto-authorization-preflight.test.js`
- `node --test .\tests\authorized-write-path-auto-authorization-cli.test.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`
- `node .\src\cli\authorized-write-path-auto-authorization.js --json --assertion-record .\tests\fixtures\external-token-material-assertion-record-v1.md`
- `node .\src\cli\governance-report.js --json --auto-auth-assertion-record .\tests\fixtures\external-token-material-assertion-record-v1.json`
- `npm test`

## Current Truth

当前默认真实治理结果仍是：

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
currentStage = await_cm0611_assertion_record
checklistFailures = [C6]
commandPreviewBundle.resolvedAssertionRecordPathMode = placeholder_only
```

而当显式 assertion-record 输入位于当前 workspace 内时，当前治理面现在会额外提供：

```text
commandPreviewBundle.resolvedAssertionRecordPathMode = workspace_relative
commandPreviewBundle.resolvedAssertionRecordPath = .\tests\fixtures\...
```

所以 `CM-0638` 只是把当前 read-only governance command preview 从“有 provenance 的占位命令”推进到了“在安全条件满足时可直接复制的 workspace-relative 命令”。
