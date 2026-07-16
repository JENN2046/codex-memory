# CM-2103-R1 Bootstrap Claim Atomicity Repair Canonical Review Surface

本审查面完整呈现 CM-2103-R1 非执行 packet 的规范等价 JSON，并绑定外部
CHANGES_REQUIRED 决定、修复后实现、隔离故障注入证据和 packet Git 对象。

本审查面不携带未来精确 bootstrap 决定，不授权或执行 bootstrap，不创建真实 store
directory / identity，不运行 empty-store preflight，不 claim 真实 nonce，也不调用任何
native memory 工具。

## R1 review decision binding

```yaml
decision_reference: "CM-2103-ER-20260711-CHANGES-REQUIRED-CLAIM-AMBIGUITY-RECEIPT-INCOMPLETE-D9D896AC"
commit: "237e7b9b3ff0ac6ca1dd970a856c346c98086d5f"
tree: "f06553a3c01d1522a91643aad6c061a1077b5c17"
blob_oid: "94b5a4b8373b4094e1ec354e174cd1825a069166"
bytes: 3270
sha256: "31135cef23dd1b52678fcb8a7689326c00e29df1a74ecdb34f92129f3e051e52"
execution_authority_carried: false
```

## Final implementation binding

```yaml
commit: "bb0217419f0a24fadb7aafd0aca4a0a616dacb60"
tree: "730c18bc4a44eb964539f18fec2565585375d7ab"

decision_intake_blob_oid: "65b28a12b1d85838f606dd2feffbaa513d73bf2f"
state_machine_blob_oid: "613374e59cb51c5467ad640cbe92716eb8002341"
governance_verifier_blob_oid: "2aa9b0b21cdd9fb01c0d82a8f5a3e66fc3a65ef7"
authorization_registry_blob_oid: "04bd090ed598d833083cf9503fbcfd04c7d1881d"
bootstrap_engine_blob_oid: "986564e26b291435423d2d4fdf3ce3d134233e82"
execution_packet_contract_blob_oid: "d94b1dd5464406f30924a69716c006abd154f4a9"
receipt_contract_blob_oid: "28815dbfda5c678ab4bddf1de21d0a81b6fd1862"
frozen_executor_blob_oid: "daeb2375e42f98ef6fa604418231016069557394"
```

## R1 packet binding

```yaml
commit: "a78b6e51e06dd43e4b3038b7f762c4ba2343a26d"
tree: "4847a4892bc2a62e6a6b306ba23b5d724aa4cb09"

json_blob_oid: "9738752179e759622065623a0359de21780db82b"
json_bytes: 12514
json_sha256: "175ece43f8f9801a4bd70d07c489c2c10da98fa03f86696069173d8a346d5698"
packet_payload_sha256: "b2b823dd737141c5933741b5fd71cb56e5cd481d09a8b6baaa861c43ab418a00"

markdown_blob_oid: "2d98616d3d5c749c9137b30c0708f0bb7b5bb44e"
markdown_bytes: 2440
markdown_sha256: "a00bc5aa9f5831d41e935056c32e18c5987c77e36befc49b4cf2640a0f549465"
```

## Claim atomicity and recovery properties

```yaml
claim_storage_model: "single_atomic_claim_envelope_in_existing_governance_root"
single_claim_envelope_create_mode: "wx"
action_registry_directory_created_by_claim: false
action_registry_identity_written_by_claim: false
nonce_marker_writes: 0
receipt_marker_writes: 0
separate_claim_record_writes: 0

claim_ambiguous_terminal_state: "CLAIM_REGISTRY_AMBIGUOUS"
terminal_replay_allowed: false
automatic_retry_allowed: false
automatic_cleanup_allowed: false
reconciliation_requires_new_decision: true
```

Claim ID 由 nonce hash 和 receipt ID hash 共同派生，binding 漂移不能产生第二个可用 claim。
Claim acknowledgement 或终态持久化不明确时，执行链只产生低披露 reconciliation evidence，
不能继续 store effect。

## Three-value receipt union

```yaml
variants:
  - "CLAIM_REGISTRY_AMBIGUOUS"
  - "CONSUMED_SUCCESS"
  - "CONSUMED_PARTIAL_BOOTSTRAP"
  - "CONSUMED_AMBIGUOUS"

tristate_effect_fields:
  - "storeDirectoryCreated"
  - "identityWriteAttempted"
  - "identityCreated"
  - "identityBytes"
  - "identitySha256"
  - "identityReadbackMatched"

success_receipt_may_be_accepted_as_bootstrap_evidence: true
partial_or_ambiguous_receipt_may_be_accepted_as_bootstrap_evidence: false
partial_or_ambiguous_receipt_may_be_accepted_as_reconciliation_evidence: true
```

Unknown filesystem effects 保持为 `null`，不再根据 effect counter 为零错误推导
`false`。

## Isolated filesystem fault-injection evidence

```yaml
test_path: "tests/cm2103-bootstrap-filesystem-fault-injection.test.js"
test_blob_oid: "e8003ec0d3174eebfcfd8faec44dafa89f3244fb"
test_bytes: 16544
test_sha256: "c0980d311b5484da2911f81af3d7e0abce2633a9f5815050bf3d24d52075b8dd"

fixture_class: "os_temp_synthetic_only"
actual_git_common_dir_governance_state_read: false
actual_git_common_dir_governance_state_written: false
actual_target_store_created: false
actual_store_identity_created: false
actual_nonce_claimed: false
actual_native_memory_called: false
```

覆盖完整成功、既有 store 的 `UNCLAIMED` 停线、claim 创建前失败、claim
acknowledgement 丢失、claim 终态持久化失败、mkdir / identity acknowledgement 丢失、
readback failure、三类 state persistence failure 和所有终态重放拒绝。

## Focused validation at packet freeze

```yaml
tests: 27
passed: 27
failed: 0

future_decision_present: false
bootstrap_execution_authorized: false
governance_filesystem_effects: 0
store_directory_created: false
store_identity_created: false
nonce_claimed: false
receipt_created: false
native_reads: 0
native_writes: 0
```

## Complete canonical-equivalent R1 packet JSON

下列单行 JSON 与 R1 packet 文件解析后的对象逐字段等价。删除
`packetPayloadSha256` 后按递归键排序并规范序列化所得 SHA-256 为
`b2b823dd737141c5933741b5fd71cb56e5cd481d09a8b6baaa861c43ab418a00`。

```json
{"schemaVersion":2,"taskId":"CM-2103-R1","packetType":"identity_bound_synthetic_store_bootstrap_execution_packet_r1_non_executing","packetPurpose":"independent_review_of_claim_atomicity_and_ambiguous_receipt_repair_without_execution","r1ReviewDecisionReference":"CM-2103-ER-20260711-CHANGES-REQUIRED-CLAIM-AMBIGUITY-RECEIPT-INCOMPLETE-D9D896AC","r1ReviewDecisionSourceCommit":"237e7b9b3ff0ac6ca1dd970a856c346c98086d5f","r1ReviewDecisionSourceTree":"f06553a3c01d1522a91643aad6c061a1077b5c17","r1ReviewDecisionPath":"docs/near-model-memory-plan-pack/phase8_bootstrap_executor_review_decision_cm2103_r1.json","r1ReviewDecisionBlobOid":"94b5a4b8373b4094e1ec354e174cd1825a069166","r1ReviewDecisionBytes":3270,"r1ReviewDecisionSha256":"31135cef23dd1b52678fcb8a7689326c00e29df1a74ecdb34f92129f3e051e52","r1ReviewDecisionPayloadSha256":"be4e2f54b6892ade8aba39006ab1869d21d88e884a734964302ef7786c4723c2","foundationDecisionReference":"CM-2102-ER-20260711-FOUNDATION-PASS-NO-EXECUTION-D6CE7C74","foundationDecisionSourceCommit":"9f73db8c6d1b7cba1a24d262880c7d37b953d2a0","foundationDecisionSourceTree":"7a4a96dc3b150dc27e6b99fab2ed6f633fb02583","foundationDecisionPath":"docs/near-model-memory-plan-pack/phase8_identity_bound_foundation_review_decision_cm2102.json","foundationDecisionBlobOid":"ea628021d499fcc883a7489a8f93a6284fdb2164","foundationDecisionBytes":4250,"foundationDecisionSha256":"9dfd43e3ad9dea0c072a181bf8ae7fd48b4e1c49e171936518972abd22d7a0dc","foundationDecisionPayloadSha256":"b1642dd9ca418ea260ec6cb204793a0a3f1eda16f411a361b4f57f3c0ee872c0","foundationPacketSourceCommit":"0c80561ae6ce2145becf438624ffdd21d1a62726","foundationPacketSourceTree":"a9c8dd787af840ad8e849fd7d3f9189614e997ff","foundationPacketPath":"docs/near-model-memory-plan-pack/phase8_identity_bound_rollback_lifecycle_foundation_cm2102.json","foundationPacketBlobOid":"929f7d39de0c01c2af5ec03c1000bfe00d8e311c","foundationPacketBytes":5460,"foundationPacketSha256":"d6ce7c743a6a0969e4468daf7577a8681b128eefc788b3412fbf4124bea72a70","foundationPacketPayloadSha256":"1739ce4bcbe870a6e41f845f8b0f30b943ceb17b671c857e9049161f13b47638","bootstrapRequestSourceCommit":"0c80561ae6ce2145becf438624ffdd21d1a62726","bootstrapRequestPath":"docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_request_cm2102.json","bootstrapRequestBlobOid":"a75b15ae7519b608338160b8ba52ede3e9ff832c","bootstrapRequestBytes":7096,"bootstrapRequestSha256":"2318692aec334acd75b54d9bdac71ada9a2c2d3d3255b76cf97a5095421927ad","bootstrapRequestPayloadSha256":"60d153e913cf1b9f1873c6e5ac98e9dfa1cb35e142eebc701dfca13ac23784da","implementationCommit":"bb0217419f0a24fadb7aafd0aca4a0a616dacb60","implementationTree":"730c18bc4a44eb964539f18fec2565585375d7ab","implementationArtifacts":{"decisionIntake":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapDecisionIntake.js","blobOid":"65b28a12b1d85838f606dd2feffbaa513d73bf2f"},"stateMachine":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapState.js","blobOid":"613374e59cb51c5467ad640cbe92716eb8002341"},"governanceVerifier":{"path":"src/core/Cm2103IdentityBoundStoreGovernance.js","blobOid":"2aa9b0b21cdd9fb01c0d82a8f5a3e66fc3a65ef7"},"authorizationRegistry":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapRegistry.js","blobOid":"04bd090ed598d833083cf9503fbcfd04c7d1881d"},"bootstrapEngine":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapEngine.js","blobOid":"986564e26b291435423d2d4fdf3ce3d134233e82"},"executionPacketContract":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapExecutionPacketContract.js","blobOid":"d94b1dd5464406f30924a69716c006abd154f4a9"},"receiptContract":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapReceiptContract.js","blobOid":"28815dbfda5c678ab4bddf1de21d0a81b6fd1862"},"frozenExecutor":{"path":"src/cli/cm2103-identity-bound-store-bootstrap.js","blobOid":"daeb2375e42f98ef6fa604418231016069557394"}},"expectedFutureDecisionReference":"CM-2103-R1-ER-20260711-IDENTITY-BOUND-STORE-BOOTSTRAP-0A7CEB6C-017307C9","futureDecisionPath":"docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_decision_cm2103_r1.json","frozenExecutorInputs":["execution_packet_commit","future_exact_bootstrap_decision_commit"],"callerStorePathAllowed":false,"environmentStorePathOverrideAllowed":false,"callerIdentityBytesAllowed":false,"callerStoreReferenceOverrideAllowed":false,"callerLifecycleOverrideAllowed":false,"callerWriteCallbackAllowed":false,"callerReconciliationCallbackAllowed":false,"action":"initialize_identity_bound_synthetic_store","lifecycleReference":"phase8-identity-bound-rollback-lifecycle-001","storeReference":"phase8-identity-bound-synthetic-rollback-store-001","storeInstanceId":"phase8-identity-bound-synthetic-rollback-store-instance-001","storeRole":"phase8_identity_bound_synthetic_rollback_store","syntheticOnly":true,"identityFilename":".codex-memory-cm2102-store-identity.json","identityBytes":633,"identitySha256":"017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57","storeRootDerivation":{"schemaVersion":1,"authority":"git_common_dir_governance_state","governanceRootIdentityReference":"codex-memory-phase8-governance-root","governanceRootIdentitySha256":"240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0","governanceRootIdentityVerificationRequired":true,"governanceRootReinitializationAllowed":false,"governanceRootReplacementAllowed":false,"governanceParentSubdir":"codex-memory-governance","storeDirectoryName":"phase8-identity-bound-synthetic-rollback-store-001","callerPathAllowed":false,"environmentPathOverrideAllowed":false,"rawPathDisclosureAllowed":false,"parentDirectoryMustAlreadyExist":true,"storeDirectoryMustBeAbsentBeforeBootstrap":true,"storeDirectoryCreateMode":"exclusive_mkdir","identityCreateMode":"exclusive_create_only"},"storeRootBinding":{"authority":"git_common_dir_governance_state","governanceRootIdentityReference":"codex-memory-phase8-governance-root","governanceRootIdentitySha256":"240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0","lifecycleReference":"phase8-identity-bound-rollback-lifecycle-001","schemaVersion":1,"storeDirectoryName":"phase8-identity-bound-synthetic-rollback-store-001","storeIdentitySha256":"017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57","storeInstanceId":"phase8-identity-bound-synthetic-rollback-store-instance-001","storeReference":"phase8-identity-bound-synthetic-rollback-store-001"},"storeRootBindingCanonicalBytes":616,"storeRootBindingSha256":"0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94","governanceRootIdentity":{"registryRootInstanceId":"cm2093-phase8-governance-root-instance-001","registryRootReference":"codex-memory-phase8-governance-root","registryRootReinitializationAllowed":false,"registryRootReplacementAllowed":false},"governanceRootIdentitySha256":"240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0","authorizationRegistryIdentity":{"authorizationRegistryReference":"cm2103-identity-bound-store-bootstrap-registry-001","claimStorageModel":"single_atomic_claim_envelope_in_existing_governance_root","lifecycleReference":"phase8-identity-bound-rollback-lifecycle-001","registryDirectoryCreatedByClaim":false,"registryIdentityWrittenByClaim":false,"registryStorageRole":"durable-local-governance-state","schemaVersion":2,"storeRootBindingSha256":"0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94"},"authorizationRegistryIdentitySha256":"7e29c465c9f0266764ac8f4436ba03f5cb1f080c322ddb5db1ccba97832bcdea","claimStorageModel":"single_atomic_claim_envelope_in_existing_governance_root","singleClaimEnvelopeAtomicCreateRequired":true,"actionRegistryDirectoryCreatedByClaim":false,"actionRegistryIdentityWrittenByClaim":false,"nonceMarkerWrites":0,"receiptMarkerWrites":0,"separateClaimRecordWrites":0,"successPartialAmbiguousReceiptUnionImplemented":true,"receiptVariants":["CLAIM_REGISTRY_AMBIGUOUS","CONSUMED_SUCCESS","CONSUMED_PARTIAL_BOOTSTRAP","CONSUMED_AMBIGUOUS"],"tristateEffectFields":["storeDirectoryCreated","identityWriteAttempted","identityCreated","identityBytes","identitySha256","identityReadbackMatched"],"filesystemFaultInjectionTestPath":"tests/cm2103-bootstrap-filesystem-fault-injection.test.js","filesystemFaultInjectionTestBlobOid":"e8003ec0d3174eebfcfd8faec44dafa89f3244fb","filesystemFaultInjectionTestBytes":16544,"filesystemFaultInjectionTestSha256":"c0980d311b5484da2911f81af3d7e0abce2633a9f5815050bf3d24d52075b8dd","filesystemFaultInjectionCases":["existing_store_unclaimed_stop","claim_write_before_create","claim_write_acknowledgement_lost","claim_terminal_state_persistence_failure","mkdir_acknowledgement_lost","identity_write_acknowledgement_lost","identity_readback_failure","directory_state_persistence_failure","identity_state_persistence_failure","success_state_persistence_failure","terminal_state_replay_rejected"],"nonce":"cm2102-identity-bound-store-bootstrap-001","receiptId":"cm2102-identity-bound-store-bootstrap-receipt-001","requestedExpiresAt":"2026-07-15T18:00:00+08:00","authorizationUseCount":1,"authorizationReplayAllowed":false,"stateSequence":["UNCLAIMED","CLAIMED","CLAIM_REGISTRY_AMBIGUOUS","STORE_DIRECTORY_CREATE_CONSUMED","STORE_DIRECTORY_CREATED","IDENTITY_WRITE_CONSUMED","IDENTITY_CREATED","IDENTITY_READBACK_CONSUMED","CONSUMED_SUCCESS","CONSUMED_PARTIAL_BOOTSTRAP","CONSUMED_AMBIGUOUS"],"maxStoreDirectoryCreates":1,"maxIdentityWrites":1,"maxIdentityReadbackVerifications":1,"maxDirectoryEnumerations":0,"maxRecordContentReads":0,"maxNativeReads":0,"maxNativeWrites":0,"maxRecordMemoryCalls":0,"maxTombstoneMemoryCalls":0,"maxVerifyOperations":0,"maxRetries":0,"maxClaimEnvelopeCreates":1,"governanceRegistryDirectoryCreates":0,"governanceRegistryIdentityWrites":0,"authorizationMarkerWrites":0,"parentDirectoryCreationAllowed":false,"identityOverwriteAllowed":false,"identityReplacementAllowed":false,"identityReinitializationAllowed":false,"identityDeletionAllowed":false,"automaticRetryAllowed":false,"automaticCleanupAllowed":false,"existingStoreDirectoryOutcome":"stop_without_read_delete_replace_or_reconcile","partialBootstrapOutcome":"stop_without_retry_cleanup_and_require_independent_reconciliation","ambiguousBootstrapOutcome":"stop_without_retry_cleanup_and_require_independent_reconciliation","futureDecisionPresentAtFreeze":false,"bootstrapExecutionAuthorizedAtFreeze":false,"storeDirectoryCreatedAtFreeze":false,"storeIdentityCreatedAtFreeze":false,"emptyStorePreflightAuthorizedAtFreeze":false,"emptyStorePreflightExecutedAtFreeze":false,"recordMemoryAuthorizedAtFreeze":false,"tombstoneMemoryAuthorizedAtFreeze":false,"verifyAuthorizedAtFreeze":false,"nonceClaimedAtFreeze":false,"receiptCreatedAtFreeze":false,"nativeReadsAtFreeze":0,"nativeWritesAtFreeze":0,"governanceFilesystemEffectsAtFreeze":0,"rollbackOrCompensationOperationsAtFreeze":0,"rollbackDrillPassed":false,"failureRecoveryProofPassed":false,"phase8Completed":false,"fullPlanPackCompleted":false,"readinessClaimed":false,"readyForImplementationReview":true,"readyForBootstrapAuthorizationReview":false,"executionBlockersAtFreeze":["future_exact_bootstrap_decision_absent","bootstrap_execution_not_authorized","store_directory_creation_not_authorized","store_identity_creation_not_authorized"],"packetPayloadSha256":"b2b823dd737141c5933741b5fd71cb56e5cd481d09a8b6baaa861c43ab418a00"}
```

## Non-claims

该 R1 packet 只证明 claim atomicity、ambiguous effect 保真和 receipt union 的非执行实现
已准备好重新审查。它不证明 bootstrap 已执行，不授权 store / identity 创建、empty-store
preflight、record、tombstone 或 verify，也不改变 `rollbackDrillPassed`、
`failureRecoveryProofPassed`、`phase8Completed`、完整计划包或 readiness 状态。
