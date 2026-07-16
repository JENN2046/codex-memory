# CM-2106 Identity-bound Synthetic Record 授权内容决定

```yaml
authorizationContentApproved: true
phase8NativeWriteAuthorized: false
nativeWriteMayExecute: false
finalExecutionReleaseReviewRequired: true

maxNativeWrites: 1
maxVerifyOperations: 1
maxRollbackOrCompensationOperations: 0
providerCallsAllowed: false
derivedIndexWritesAllowed: false
```

本决定只冻结 Route B 新 synthetic record 的内容、scope、context、allowlist、nonce 和
receipt。它不能单独 claim 授权或执行 `record_memory`；只有后续 final release 精确绑定
execution packet 与本决定的 Git identity 后，executor 才可能进入一次性写入。
