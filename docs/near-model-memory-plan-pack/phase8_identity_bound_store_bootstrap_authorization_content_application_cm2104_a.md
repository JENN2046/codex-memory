# CM-2104-A 精确 Bootstrap 授权内容申请

## 申请结论

本次只申请独立审查未来 content decision 的静态授权内容：

```yaml
requested_future_content:
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

申请不创建正式 content decision 文件，不填充 reviewer-assigned `approvedAt`，不签发 final
release，也不运行 executor。

## 精确绑定

```yaml
gate_packet:
  commit: "67eaab147cb856180a7ddd0491c5e5cc2f01324f"
  blob_oid: "c5a2c6e4eb6c0911895c44b41c07244fe96d61e9"
  sha256: "0ad7e1cb4ff30cc993c9625fcefe0328d9c78d9a4227ffb6c9409b5faa4c0f8e"
  payload_sha256: "e57a98e9151583029843ff3ce93ca60ad45ebbfcd91e9c7fce7e0362969359da"

implementation:
  commit: "53e5524937c030cab1ecf48a3d9d5006af34dca6"
  tree: "94cbbb695e3e2a4e75367ec0165bba5285a4a502"

requested_content_static_fields_sha256: "46c9e2466959501747ee4cf7707ddaa7a6499981d7ba9a466f0c4c1cd08c6823"
application_payload_sha256: "07b8ce5d2c7d4d21eca4980cd701148e40f4e00aeb3b3fffb3001df525c9e21d"
requested_expiry: "2026-07-15T18:00:00+08:00"
```

## 后续顺序

```text
独立 content application 审查
→ 审查者签发带 approvedAt 的精确 content decision 原始字节
→ 单独冻结 content decision commit/blob/SHA
→ 准备 final execution-release application
→ 独立 final-release review
```

当前副作用计数全部为零；`rollbackDrillPassed`、`failureRecoveryProofPassed` 和
`phase8Completed` 继续为 `false`。
