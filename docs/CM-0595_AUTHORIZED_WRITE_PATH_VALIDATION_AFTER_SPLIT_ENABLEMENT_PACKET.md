# CM-0595 Authorized Write-Path Validation After Split Enablement Packet

Status: DRAFT_NOT_APPROVED
Decision: AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_PENDING
Date: 2026-05-20

## Purpose

This packet refines the post-enable write boundary after CM-0592 and CM-0593.

It exists because CM-0591 required CM-0590 evidence itself to prove both token boundary and endpoint health, but CM-0592 resolved only the endpoint/startup side while CM-0596, CM-0598, and CM-0600 proved the subsequent token-only attempts still failed closed.

This packet therefore allows a future write validation only if split prerequisite evidence exists on the same baseline:

- endpoint/startup evidence from CM-0592
- fresh token-presence evidence from CM-0601 or an equivalent future presence-only rebound recheck after external token availability changes

## Exact Scope

This packet requests future exact approval for one bounded unit only:

```text
AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_001
```

## Required Prior Evidence

- approved CM-0592 evidence on the same target baseline proving loopback endpoint healthy
- approved CM-0601 rebound evidence or equivalent fresh presence-only evidence on the same target baseline proving current-session token already present

Without both, this packet remains blocked.

## Permitted Only Under Exact Approval

- re-read branch, `HEAD`, `origin/main`, and remote main
- confirm same-baseline CM-0592 and fresh presence-only evidence exists
- execute exactly one sanitized durable memory write through public `record_memory`
- allow only the normal unavoidable single write-path audit side effect
- record one bounded execution/evidence note
- update docs/board after execution

## Forbidden Unless Separately Approved

- `search_memory`
- marker search
- second write
- `observe:http`
- `.jsonl` read
- provider/model call
- config file edit
- watchdog/startup persistence change
- public MCP expansion
- migration/import/export/backup/restore apply
- readiness claim

## Required Approval Line

Suggested future approval line:

```text
授权执行 CM-0595，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_001，并且仅在同一 baseline 下已存在经批准执行的 CM-0592 endpoint/startup evidence 与经批准执行的 CM-0601 current-session token presence rebound evidence（或等价的更新 presence-only evidence）证明 token 已存在的前提下，允许 exactly one sanitized durable memory write through public record_memory and only the normal write-path audit side effect；禁止 search_memory / marker search / observe:http / .jsonl read / provider / config change / watchdog or startup persistence / public MCP expansion / additional durable write / readiness claim。
```

## Next Safe Action

Do not route back through consumed CM-0594 directly.

Do not route back through consumed CM-0597 directly.

Do not route through consumed CM-0599 directly either.

Only after token material is independently available and CM-0601 or an equivalent fresh presence-only rebound recheck succeeds on the same baseline should CM-0595 become the next exact approval candidate.
