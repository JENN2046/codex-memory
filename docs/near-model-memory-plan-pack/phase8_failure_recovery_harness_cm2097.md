# CM-2097 Isolated Failure-Recovery Harness

该 harness 根据 `CM-2097-ER-20260711-FAILURE-RECOVERY-ROUTE-PASS-NO-EXECUTION-C8DBFB58` 实现固定 manifest 编译与校验，不实现 case 执行。

内建 case 只有三种：claim 前失败、claim 后 write invocation 前失败、durable commit 后 acknowledgement 丢失。每个 case 使用独立 nonce、receipt 和 registry reference。普通调用者不能覆盖 failure stage，也不能注入 callback。

三个 JSON manifest 当前全部是 `isolated_synthetic_failure_case_non_executing`，并保持：

```yaml
executionAuthorized: false
nativeWriteAuthorized: false
verifyAuthorized: false
retryCount: 0
rollbackCount: 0
compensationCount: 0
failureRecoveryProofPassed: false
phase8Completed: false
```

本轮测试只比较静态 manifest 与内建合同，不 claim registry、不创建 receipt、不启动 runtime、不执行 fault injection 或 durable write。
