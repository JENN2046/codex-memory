# CM-2106 Identity-bound Synthetic Record Final Execution Release

```yaml
executionReleaseAuthorized: true
phase8NativeWriteAuthorized: true
authorizationUseCount: 1

maxNativeWrites: 1
maxVerifyOperations: 1
maxRollbackOrCompensationOperations: 0
automaticRetryAllowed: false
providerCallsAllowed: false
derivedIndexWritesAllowed: false
```

本决定只释放一次精确 `record_memory`：目标为 Route B identity-bound synthetic store，
durable record 为 327-byte Markdown，随后只允许一次低披露 audit verify。

授权一旦 claim 即不可重放；它不授权 tombstone、supersede、compensation、真实记忆读取、
provider、derived index、release/deploy 或 readiness 声明。
