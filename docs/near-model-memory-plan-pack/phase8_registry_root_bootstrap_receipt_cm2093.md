# CM-2093 Registry Root Bootstrap Receipt

CM-2093 内容决定已冻结到提交：

```text
aecc431de4533e1c3a0e9f42948b217f835b4c7e
```

决定 blob 与 SHA-256：

```text
blob: bc251e7a34152b41724f3c098fee12baefe0f787
sha256: 9fb37b29e18ee65225e8e2fcb9628260ba93afb5ced6c195388e390570daa5dc
```

在工作区干净且 HEAD 精确等于上述提交后，bootstrap 执行器使用 `wx` 独占创建
registry root identity。创建后只读复核结果：

```yaml
registry_root_identity_exists: true
registry_root_identity_bytes: 216
registry_root_identity_sha256: "240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0"
authorization_use_count: 1
authorization_consumed: true
authorization_replay_allowed: false

nonce_files: 0
execution_receipt_files: 0
claim_files: 0
write_invocation_files: 0
native_writes: 0
verify_operations: 0
rollback_or_compensation_operations: 0
real_memory_reads: 0
```

回执与边界验证结果：

```yaml
focused_tests: "6/6"
default_tests: "5172/5172"
strict_contract_tests: "106/106"
compare_cases: "43/43"
rollback_cases: "43/43"
docs_validation: "PASS"
current_facts_drift: "PASS"
ledger_consistency: "PASS"
diff_check: "PASS"
```

这里的 bootstrap receipt 是项目治理回执，不是 Phase 8 native execution
receipt。第四个 decision slot 继续保持 `false`。本回执不授权 execution
manifest、final release、nonce claim、`record_memory`、verify、rollback、
compensation 或任何 readiness 声明。
