# CM-2104-A 精确 Bootstrap 授权内容独立审查申请

## 只申请内容批准，不申请执行释放

```yaml
requested_future_content_decision:
  authorizationContentApproved: true
  bootstrapExecutionAuthorized: false
  storeDirectoryCreationAuthorized: false
  storeIdentityCreationAuthorized: false
  identityReadbackVerificationAuthorized: false
  finalExecutionReleaseReviewRequired: true

current_authority:
  authorizationContentApproved: false
  bootstrapExecutionAuthorized: false
```

外部审查记录只作为参考；申请是否成立，以 application contract、冻结 Git objects 和当前
仓库无决定文件、无副作用的现实为准。

## 审查绑定

```yaml
application_contract:
  commit: "a5654894993a160366e2da4bbf3325dd8cedc10e"
  tree: "ea6a2cb4e8084df50c720c114c999047247e100e"
  contract_blob_oid: "5f70e72369b3c540658931c5d4888f0b855998f7"

application:
  commit: "3477c567642e47e12bfed30711b182f18d49b074"
  tree: "7764f067b0b61cfee54c00329c9f91db1495f8b1"
  blob_oid: "5753fa4483b936c64ae4f752032a5d543bf93969"
  bytes: 8546
  sha256: "015b1a0c049d7f841399e9874faafd681a573259f005f64a7854de51b535fa9b"
  payload_sha256: "07b8ce5d2c7d4d21eca4980cd701148e40f4e00aeb3b3fffb3001df525c9e21d"

requested_content_static_fields_sha256: "46c9e2466959501747ee4cf7707ddaa7a6499981d7ba9a466f0c4c1cd08c6823"
requested_expiry: "2026-07-15T18:00:00+08:00"
```

精确静态内容已经在 application JSON 中冻结。`approvedAt` 必须由独立审查者分配，且早于
expiry；审查通过后，完整 content decision 原始字节仍需单独冻结并记录 commit/blob/SHA。

## 申请合同的 fail-closed 边界

以下任一变化都会拒绝 application：

* content application 冒充已经签发决定；
* content 或 final-release 文件提前存在；
* application 提前进入 final-release review 或 bootstrap execution；
* 当前 authority 中任何执行字段变为 `true`；
* 任何 claim、directory、identity、native、retry、cleanup 或 remote effect 非零；
* future content 静态字段自行打开 bootstrap；
* gate packet Git identity、静态内容 hash 或 application payload hash 漂移。

## 验证与零副作用

```yaml
focused_tests: 48
focused_passed: 48
focused_failed: 0
default_safe_tests_exit_code: 0

content_decision_file_present: false
final_release_decision_file_present: false
executor_run: false
claim_envelope_created: false
store_directory_created: false
store_identity_created: false
native_reads: 0
native_writes: 0
rollback_or_compensation_operations: 0

rollbackDrillPassed: false
failureRecoveryProofPassed: false
phase8Completed: false
fullPlanPackCompleted: false
readinessClaimed: false
```

若本 application 独立通过，下一步仅允许冻结审查者签发的 content decision 原始字节。
不得同时生成 final release，不得运行 executor。
