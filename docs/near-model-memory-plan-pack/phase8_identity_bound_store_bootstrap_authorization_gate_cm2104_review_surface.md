# CM-2104-PRE 双阶段 Bootstrap 授权门禁独立审查申请

## 申请结论

本次只申请确认：CM-2104 的“授权内容决定”和“最终执行释放决定”已经在机器门禁中分离。

```yaml
requested:
  twoStageBootstrapAuthorizationGateImplementationPassed: true
  readyForExactBootstrapAuthorizationContentApplication: true

not_requested:
  bootstrapExecutionAuthorized: true
  storeDirectoryCreationAuthorized: true
  storeIdentityCreationAuthorized: true
```

## 为什么没有直接提交可执行的 CM-2104 决定

外审要求 CM-2104 的决定内容与最终 Git identity 分开冻结，并在独立 final
execution-release review 通过前保持不可执行。现实核对发现，获批的 R2 executor 当时只接受：

```text
execution packet commit
+ one bootstrap decision commit with authorized=true
```

它没有第二份 final-release decision 的机器 intake。若直接冻结 `authorized=true` 的决定，
代码会把文档中的“尚未释放”误当成可执行权限。因此本次先修复机器门禁，不越级申请执行。

## 新的机器强制顺序

```text
authorization gate packet Git intake
→ authorization content decision Git intake
  (content approved, execution=false)
→ final execution-release decision Git intake
  (bind exact content commit/blob/SHA)
→ runtime commit/tree and artifact verification
→ governance-root verification
→ one-shot claim/bootstrap
```

入口现在只接受三个 Git commit 参数。缺少 final release commit 时，会在读取 packet 或访问
治理目录之前停止。内容决定的普通对象副本和 final release 的普通对象副本都不携带机器身份。

## 精确绑定

```yaml
r2_pass_review_decision:
  reference: "CM-2103-R2-ER-20260712-IMPLEMENTATION-PASS-NO-EXECUTION-F4BA5627"
  freeze_commit: "29d6afea40dd7dbb13e8e237967fda80d5d0020d"

r2_base:
  implementation_commit: "808fac45c0b21b1ba6cc97513b2692cced403d54"
  packet_commit: "c0286d7341ee46ee94198c761462bf27336cdec0"
  packet_sha256: "f4ba5627e8ef651685f11ec6be5a4e81bca15e8844fa9c600e9868c84b4c8ebc"
  packet_payload_sha256: "5da91016365599346dad93cac7ed16a2012730dcf613d3349e728188ce72d0b1"

two_stage_gate_implementation:
  commit: "53e5524937c030cab1ecf48a3d9d5006af34dca6"
  tree: "94cbbb695e3e2a4e75367ec0165bba5285a4a502"

authorization_gate_packet:
  commit: "67eaab147cb856180a7ddd0491c5e5cc2f01324f"
  tree: "5ad4fb736034172bfb96ce8c34a492e509b9acfa"
  blob_oid: "c5a2c6e4eb6c0911895c44b41c07244fe96d61e9"
  bytes: 7843
  sha256: "0ad7e1cb4ff30cc993c9625fcefe0328d9c78d9a4227ffb6c9409b5faa4c0f8e"
  payload_sha256: "e57a98e9151583029843ff3ce93ca60ad45ebbfcd91e9c7fce7e0362969359da"
```

## 验证

```yaml
focused_tests: 44
focused_passed: 44
focused_failed: 0
default_safe_tests_exit_code: 0
provider_tests_run: false
runtime_started: false
```

负向覆盖包括：内容决定自行打开执行、final release 缺失、内容 Git identity 漂移、packet
commit/blob/SHA 漂移、identity 漂移、expiry 失效、权限或计数扩大、普通对象复制以及 packet
越权字段漂移。

## 当前零副作用状态

```yaml
authorization_content_decision_present: false
final_execution_release_decision_present: false
bootstrap_execution_authorized: false
claim_created_in_real_governance_root: false
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

若本实现审查通过，下一步才是准备 CM-2104 精确授权内容申请。该内容决定仍必须保持
`bootstrapExecutionAuthorized=false`，随后冻结其 Git identity，再提交独立 final
execution-release review。
