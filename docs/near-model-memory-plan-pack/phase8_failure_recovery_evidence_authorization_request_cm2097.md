# codex-memory CM-2097 Failure Recovery Evidence 独立申请

本申请只请求审查 `failureRecoveryProofPassed` 的未来证据路线，不申请立即执行或授权 native write、verify、retry、rollback 或 compensation。

## 当前事实

CM-2095 application receipt 已独立接受，但 `failureRecoveryProofPassed=false`、`rollbackDrillPassed=false`、`phase8Completed=false`。既有 CM-2094 native write 授权已经消费且不可重放。

## 申请边界

未来执行包必须使用 synthetic failure injection，冻结精确 failure stage、executor、一次性 registry、低披露 receipt，并分别证明：claim 前失败无副作用；pre-commit 失败后授权被消费且不重试；post-commit 结果不明确时停止且不重试、不补偿。

当前仓库尚未冻结上述端到端执行器，因此本申请不签发执行权限，不调用 runtime，不 claim nonce，不创建 execution receipt，不修改或读取真实记忆。

## 当前决定状态

```yaml
authorization_requested_now: false
execution_requested_now: false
native_actions_authorized_now: 0
failure_recovery_operations_authorized_now: 0
failureRecoveryProofPassed: false
rollbackDrillPassed: false
phase8Completed: false
readinessClaimed: false
```

本申请与 rollback drill 证据申请相互独立。任何真实 native action、补偿或 rollback 都必须另行取得 action-specific 精确授权。
