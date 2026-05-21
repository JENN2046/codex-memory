# CM-0632 Authorized Write-Path Assertion Record Input Trace Surface

状态：`COMPLETED_VALIDATED_NOT_READY`

## Purpose

`CM-0631` 已经让当前 fail-closed auto-authorization 链可以直接消费填写后的 `CM-0611` Markdown record。

这一步继续把“当前治理结果到底吃了哪一份 assertion artifact”收紧成标准化、机器可读、只读 provenance surface，避免后续 operator 或 automation 只看到 `AUTO_REUSE_CM0601_LINE_ONLY` / `ESCALATE_FOR_FUTURE_WIDENING_REVIEW`，却看不到：

- 输入来自默认 fixture，还是显式 assertion record
- assertion record 是 `.json` 还是填写后的 `CM-0611` Markdown note
- 当前消费的文件名是什么
- 是否附带 `latestReboundOutcomeClass` override
- 当前这份 record 是否真的让 `CM-0608/C6` 进入 accepted

## Scope

本次只补 governance-only input provenance：

- `authorized-write-path-auto-authorization` helper CLI
- `governance-report`
- `dashboard`
- `http-observe`

不执行 runtime action，不签发 approval，不执行 `CM-0601`，不自动放宽到 `CM-0595`。

## Result

当前 auto-authorization surface 现在额外暴露 `assertionRecordInputTrace`：

- 默认 fixture-only 路径：`assertionRecordInputTrace = null`
- 显式 assertion record 路径：暴露 `sourceFormat`、`sourcePath`、`sourceFileName`、`sourceArtifactRef`、`decision`、`contractVerdict`、`assertionClass`、`assertedAt`、`assertionAcceptedForC6`、`usedLatestReboundOutcomeOverride`、`latestReboundOutcomeOverride`

这意味着未来 token material 真的独立进入当前 session 后，operator/automation 不只知道“治理判断是什么”，也能知道“这个治理判断是基于哪份 assertion artifact 做出来的”。

## Boundaries Preserved

- 不证明 token 已存在
- 不签发 approval
- 不执行 `CM-0601`
- 不自动授权 `CM-0595`
- 不执行 `record_memory`
- 不执行 `search_memory`
- 不调用 provider
- 不读 `.jsonl`
- 不改变 `RC_NOT_READY_BLOCKED`

## Validation

- targeted helper / control-surface tests
- full `npm test`
- `git diff --check`
- docs validation

## Conclusion

`CM-0632` 把当前 auto-authorization 链从“能吃 assertion record”推进到了“能显式记账这次到底吃了哪份 assertion record”。

这仍然只是 governance-only 进展，不是 runtime enablement，也不是 write-path closure。
