# CM-2106-R1 Identity-bound Synthetic Record 授权内容决定

旧 CM-2106 授权已消费且不可重放；低披露对账证明它在 native commit 前停止，目标
store 仍为空。本决定使用全新的 nonce、receipt、registry 和 app-state reference，
不是自动 retry。

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

R1 将 runtime target 规范化为 `VCPToolBox native memory`，并把后续执行的 rollback
posture 固定为 bridge contract 接受的 `bounded_rollback_plan`。本决定本身不可执行。
