# CM-0641 Authorized Write-Path Rendered Operator Artifact Command Preview Surface

更新时间：2026-05-21

## Goal

把当前 `renderedArtifactTextSurface.selectedDraftMarkdown` 也推进到和 `commandPreviewBundle` / `renderedOperatorPacketTextSurface` 一样自带 stage-aligned review commands，避免 operator 只看 draft 时还要回头找 packet。

## What changed

- `AuthorizedWritePathAutoAuthorizationPreflight` 现在在四类 rendered artifact draft 上统一追加 `## Command Preview`
  - `CM-0611` assertion record draft
  - `CM-0614` issuance draft
  - `CM-0615` routing outcome draft
  - `CM-0616` widening review draft
- `buildRenderedArtifactTextSurface()` 现在直接消费当前 `commandPreviewBundle`
- draft 文本里的 command preview 与 packet 文本里的 command preview 共用同一套解析结果
- 当显式 assertion-record 输入位于 workspace 内时，rendered artifact draft 会直接带出 workspace-relative review commands
- 当治理结果依赖 `latestReboundOutcomeOverride` 时，rendered artifact draft 里的 review commands 现在也会显式带上 `--auto-auth-latest-rebound-outcome-class ...`

## Result

当前治理链现在不只是：

- 有结构化 `commandPreviewBundle`
- 有 rendered operator packet 的 `## Command Preview`

还额外具备：

- 当前选中的 rendered artifact draft 自己也带 `## Command Preview`

这意味着未来 operator 即使只看当前 draft，也能直接知道下一条 helper / `governance-report` / `dashboard` / `http-observe` review command，而不用再回头查 packet。

## Boundaries preserved

这仍然只是 governance-only read-only surface refinement：

- 不证明 token 已存在
- 不签发 approval
- 不执行 `CM-0601`
- 不自动放宽到 `CM-0595`
- 不执行 `record_memory`
- 不执行 `search_memory`
- 不执行 provider
- 不触达 runtime mutation

当前控制状态仍保持：

```text
RC_NOT_READY_BLOCKED
```

## Validation

已通过：

```text
node --check .\src\core\AuthorizedWritePathAutoAuthorizationPreflight.js
node --test .\tests\authorized-write-path-auto-authorization-preflight.test.js
node --test .\tests\authorized-write-path-auto-authorization-cli.test.js
node --test .\tests\governance-report-cli.test.js
node --test .\tests\dashboard-cli.test.js
node --test .\tests\http-observe-cli.test.js
node .\src\cli\authorized-write-path-auto-authorization.js --rendered-operator-artifact-text --assertion-record .\tests\fixtures\external-token-material-assertion-record-v1.json --latest-rebound-outcome-class token_present
node .\src\cli\governance-report.js --rendered-operator-artifact-text --auto-auth-assertion-record .\tests\fixtures\external-token-material-assertion-record-v1.json --auto-auth-latest-rebound-outcome-class token_present
```

其中 widening-review spot check 已实证：

- rendered artifact draft 自带 `## Command Preview`
- workspace-relative path 被保留
- `token_present` override 会进入 rendered draft 里的 review commands
