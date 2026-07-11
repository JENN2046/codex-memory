# CM-2106 Identity-bound Synthetic Record Fail-closed Reconciliation

```yaml
result: FAIL_CLOSED_NO_WRITE
durable_record_count: 0
write_directory_present: false
native_write_reached_bridge: false

authorization_consumed: true
authorization_replay_allowed: false
automatic_retry_performed: false
```

首次 CM-2106 assertion 已原子消费，但 strict bridge 在 native delegation 前拒绝了
runtime-target 与 rollback-posture 形状。执行器按保守规则记录
`CONSUMED_AMBIGUOUS_POST_COMMIT`；随后精确 store 对账确认只有 identity 文件，目标
write directory 不存在，低披露 governance audit 也没有本次 bridge finding。

现实分类因此是“授权已消费、native commit 前停止、零 durable write”。旧 nonce、receipt
和 registry 永不重放。后续若继续，只能修正合同后签发新的 action-specific authorization；
不能把新授权称作自动 retry。
