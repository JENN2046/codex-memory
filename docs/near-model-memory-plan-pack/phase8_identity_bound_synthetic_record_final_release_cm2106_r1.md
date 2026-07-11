# CM-2106-R1 Identity-bound Synthetic Record Final Release

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

本决定使用新的 action-specific authorization，仅释放一次精确的 327-byte synthetic
record write 和一次低披露 verify。首次 CM-2106 授权保持已消费且不可重放。

R1 不授权 tombstone、supersede、compensation、真实记忆读取、provider、derived index、
release/deploy 或 readiness 声明。
