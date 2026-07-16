# codex-memory CM-2096 Rollback Drill Evidence 独立申请

本申请只请求审查 `rollbackDrillPassed` 的未来证据路线，不申请立即执行或授权任何 rollback、tombstone、supersede、compensation、native write 或 verify。

## 当前事实

CM-2095 application receipt 已由 `CM-2095-ER-20260711-APPLICATION-RECEIPT-PASS-8C8A22F8` 独立接受。`phase8ReceiptBundleAppliedToCompletionAudit=true`，但 `rollbackDrillPassed=false`、`failureRecoveryProofPassed=false`、`phase8Completed=false`。

## 申请边界

本轮只申请确认后续证据必须独立绑定：精确 action、仅限 CM-2094 synthetic proof record 的目标、冻结 executor、一次性 registry、低披露 receipt 和 receipt 独立复核。当前仓库尚未冻结可执行机制，因此本申请不选择 tombstone 或 supersede，也不把 compensation 隐含为 rollback。

任何补偿动作都按新的 native write 计数，必须获得新的 action-specific 精确授权。不得修改或读取既有真实记忆，不得自动重试、自动回滚、切换 local fallback、删除 marker 或重建 registry。

## 当前决定状态

```yaml
authorization_requested_now: false
execution_requested_now: false
native_actions_authorized_now: 0
rollback_or_compensation_operations_authorized_now: 0
rollbackDrillPassed: false
failureRecoveryProofPassed: false
phase8Completed: false
readinessClaimed: false
```

本申请与 failure-recovery 证据申请相互独立，任何一方不得推导另一方通过或获得执行权限。
