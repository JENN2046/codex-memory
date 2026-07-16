# CM-2103-R2 Durable Claim Re-entry Canonical Review Surface

本审查面完整呈现 CM-2103-R2 非执行 packet 的规范等价 JSON，并绑定外部
CHANGES_REQUIRED 决定、durable re-entry 实现、隔离进程重入证据和 packet Git 对象。

本审查面不携带未来精确 bootstrap 决定，不授权或执行 bootstrap，不创建真实 store
directory / identity，不运行 empty-store preflight，不 claim 真实 nonce，也不调用任何
native memory 工具。

## R2 review decision binding

```yaml
decision_reference: "CM-2103-R1-ER-20260711-CHANGES-REQUIRED-DURABLE-REENTRY-INCOMPLETE-175ECE43"
commit: "a0191b2be4eb7ef44e5919e9af89d3d31c373c93"
tree: "01016e0fe7eb332056657200ce44ed8047c941a1"
blob_oid: "df4fc6d519be7208c68752f71eb67fc376e114f8"
bytes: 4393
sha256: "4dfe57dcee82c8a1ac34c7717590cf5e1ef57aabf6804f316ef6871a15daddce"
payload_sha256: "dd8c65de44e38f5245e1cfe9b575baa208f6d077c7c9bca5a5f79e3ae2bf6d4d"
execution_authority_carried: false
```

## Final implementation binding

```yaml
commit: "808fac45c0b21b1ba6cc97513b2692cced403d54"
tree: "32f336c3c4776c964de227ac8911a233b01407a0"

decision_intake_blob_oid: "0cf8002d2b1b159280b210b533a593a3cc5ace1a"
state_machine_blob_oid: "62c30673c002ebe8de01d31fe4dc66ff9c7c9ed1"
governance_verifier_blob_oid: "2aa9b0b21cdd9fb01c0d82a8f5a3e66fc3a65ef7"
authorization_registry_blob_oid: "b9a63e62acd9a0aa9a2e948d6fab03ed79aeeac7"
bootstrap_engine_blob_oid: "58d66ae936c0e633164cd6859e885049b4f9927c"
execution_packet_contract_blob_oid: "de995bb249b3d0c0c9334cee4ea0522ee4710d3e"
receipt_contract_blob_oid: "5219d5fbdb8c43b177e184afe9cf97095e00b5d6"
frozen_executor_blob_oid: "c3d6cb3d09853c3068726c75fc09e398eeb1fd8d"
```

## R2 packet binding

```yaml
commit: "c0286d7341ee46ee94198c761462bf27336cdec0"
tree: "794438793c4c5000e87e35a611fbb29fbae6fb85"

json_blob_oid: "3231b4b037793a05547e7f0a19c428fe5f0c284e"
json_bytes: 14476
json_sha256: "f4ba5627e8ef651685f11ec6be5a4e81bca15e8844fa9c600e9868c84b4c8ebc"
packet_payload_sha256: "5da91016365599346dad93cac7ed16a2012730dcf613d3349e728188ce72d0b1"

markdown_blob_oid: "97be2eb6b115a417b85826f0237bbcfdf2431b74"
markdown_bytes: 1979
markdown_sha256: "a37003595adda7aadb77761f1de9d6c46ed8da82ca5943e5a647dfb3e09dfe71"
```

## Durable re-entry properties

```yaml
existing_terminal_receipt_reconstruction: true
nonterminal_claim_projection: true
corrupt_envelope_low_disclosure_projection: true
unreadable_envelope_low_disclosure_projection: true

reentry_terminal_state_persistence_allowed: false
reentry_may_replay_bootstrap: false
reentry_may_create_store_effects: false
max_store_filesystem_accesses_during_reentry: 0
max_store_filesystem_writes_during_reentry: 0

raw_envelope_returned: false
automatic_retry_allowed: false
automatic_cleanup_allowed: false
```

Existing claim 检查先于 target-store 检查。发现 durable envelope 后，只允许验证安全文件类型、
精确 binding 和低披露 effect shape；不会执行 target-store `lstat`、`mkdir`、identity
read/write、rename 或 native memory 操作。

## Persistence-unknown effect semantics

```yaml
governance_filesystem_effect_attempted: true
governance_filesystem_effects_present: "true | null"

claim_envelope_persistence_unknown:
  claim_envelope_present: null
  claim_envelope_binding_verified: false
  governance_filesystem_effects_present: null

existing_corrupt_or_unreadable_envelope:
  claim_envelope_present: true
  claim_envelope_binding_verified: false
  store_directory_created: null
  identity_write_attempted: null
  identity_created: null
```

Receipt contract 会拒绝把 persistence-unknown 的 `null` 改写成 `true` 或 `false`。

## Isolated evidence

```yaml
base_fault_test:
  path: "tests/cm2103-bootstrap-filesystem-fault-injection.test.js"
  blob_oid: "2ba16a716ea48ee2d0482529930c09505dc200ce"
  bytes: 16897
  sha256: "21057926a93056137619e9d47ccb29c7a5eec1e28e5c2d7342ec36292c941e91"

durable_reentry_test:
  path: "tests/cm2103-bootstrap-durable-reentry.test.js"
  blob_oid: "46d00af10bdca40f26f236e690945001edd39707"
  bytes: 18998
  sha256: "a08cbac7a040c2155271cea3327995e4e54c60fcf7b4880f96e553e7b7f8776d"

fixture_class: "os_temp_synthetic_only"
actual_git_common_dir_governance_state_read: false
actual_git_common_dir_governance_state_written: false
actual_target_store_created: false
actual_store_identity_created: false
actual_nonce_claimed: false
actual_native_memory_called: false
```

覆盖 persistence-unknown、新 registry 实例重入、全部六个非终态、损坏 envelope、不可读
envelope、已持久化 `CLAIM_REGISTRY_AMBIGUOUS`、已持久化 success，以及重入期间零
target-store effect。

## Focused validation at packet freeze

```yaml
tests: 39
passed: 39
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

## Complete canonical-equivalent R2 packet JSON

下列单行 JSON 与 R2 packet 文件解析后的对象逐字段等价。删除
`packetPayloadSha256` 后按递归键排序并规范序列化所得 SHA-256 为
`5da91016365599346dad93cac7ed16a2012730dcf613d3349e728188ce72d0b1`。

```json
{"schemaVersion":3,"taskId":"CM-2103-R2","packetType":"identity_bound_synthetic_store_bootstrap_execution_packet_r2_non_executing","packetPurpose":"independent_review_of_durable_claim_reentry_and_persistence_unknown_receipt_repair_without_execution","foundationDecisionReference":"CM-2102-ER-20260711-FOUNDATION-PASS-NO-EXECUTION-D6CE7C74","foundationDecisionSourceCommit":"9f73db8c6d1b7cba1a24d262880c7d37b953d2a0","foundationDecisionSourceTree":"7a4a96dc3b150dc27e6b99fab2ed6f633fb02583","foundationDecisionPath":"docs/near-model-memory-plan-pack/phase8_identity_bound_foundation_review_decision_cm2102.json","foundationDecisionBlobOid":"ea628021d499fcc883a7489a8f93a6284fdb2164","foundationDecisionBytes":4250,"foundationDecisionSha256":"9dfd43e3ad9dea0c072a181bf8ae7fd48b4e1c49e171936518972abd22d7a0dc","foundationDecisionPayloadSha256":"b1642dd9ca418ea260ec6cb204793a0a3f1eda16f411a361b4f57f3c0ee872c0","foundationPacketSourceCommit":"0c80561ae6ce2145becf438624ffdd21d1a62726","foundationPacketSourceTree":"a9c8dd787af840ad8e849fd7d3f9189614e997ff","foundationPacketPath":"docs/near-model-memory-plan-pack/phase8_identity_bound_rollback_lifecycle_foundation_cm2102.json","foundationPacketBlobOid":"929f7d39de0c01c2af5ec03c1000bfe00d8e311c","foundationPacketBytes":5460,"foundationPacketSha256":"d6ce7c743a6a0969e4468daf7577a8681b128eefc788b3412fbf4124bea72a70","foundationPacketPayloadSha256":"1739ce4bcbe870a6e41f845f8b0f30b943ceb17b671c857e9049161f13b47638","bootstrapRequestSourceCommit":"0c80561ae6ce2145becf438624ffdd21d1a62726","bootstrapRequestPath":"docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_request_cm2102.json","bootstrapRequestBlobOid":"a75b15ae7519b608338160b8ba52ede3e9ff832c","bootstrapRequestBytes":7096,"bootstrapRequestSha256":"2318692aec334acd75b54d9bdac71ada9a2c2d3d3255b76cf97a5095421927ad","bootstrapRequestPayloadSha256":"60d153e913cf1b9f1873c6e5ac98e9dfa1cb35e142eebc701dfca13ac23784da","implementationCommit":"808fac45c0b21b1ba6cc97513b2692cced403d54","implementationTree":"32f336c3c4776c964de227ac8911a233b01407a0","implementationArtifacts":{"decisionIntake":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapDecisionIntake.js","blobOid":"0cf8002d2b1b159280b210b533a593a3cc5ace1a"},"stateMachine":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapState.js","blobOid":"62c30673c002ebe8de01d31fe4dc66ff9c7c9ed1"},"governanceVerifier":{"path":"src/core/Cm2103IdentityBoundStoreGovernance.js","blobOid":"2aa9b0b21cdd9fb01c0d82a8f5a3e66fc3a65ef7"},"authorizationRegistry":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapRegistry.js","blobOid":"b9a63e62acd9a0aa9a2e948d6fab03ed79aeeac7"},"bootstrapEngine":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapEngine.js","blobOid":"58d66ae936c0e633164cd6859e885049b4f9927c"},"executionPacketContract":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapExecutionPacketContract.js","blobOid":"de995bb249b3d0c0c9334cee4ea0522ee4710d3e"},"receiptContract":{"path":"src/core/Cm2103IdentityBoundStoreBootstrapReceiptContract.js","blobOid":"5219d5fbdb8c43b177e184afe9cf97095e00b5d6"},"frozenExecutor":{"path":"src/cli/cm2103-identity-bound-store-bootstrap.js","blobOid":"c3d6cb3d09853c3068726c75fc09e398eeb1fd8d"}},"expectedFutureDecisionReference":"CM-2103-R2-ER-20260711-IDENTITY-BOUND-STORE-BOOTSTRAP-0A7CEB6C-017307C9","futureDecisionPath":"docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_decision_cm2103_r2.json","frozenExecutorInputs":["execution_packet_commit","future_exact_bootstrap_decision_commit"],"callerStorePathAllowed":false,"environmentStorePathOverrideAllowed":false,"callerIdentityBytesAllowed":false,"callerStoreReferenceOverrideAllowed":false,"callerLifecycleOverrideAllowed":false,"callerWriteCallbackAllowed":false,"callerReconciliationCallbackAllowed":false,"action":"initialize_identity_bound_synthetic_store","lifecycleReference":"phase8-identity-bound-rollback-lifecycle-001","storeReference":"phase8-identity-bound-synthetic-rollback-store-001","storeInstanceId":"phase8-identity-bound-synthetic-rollback-store-instance-001","storeRole":"phase8_identity_bound_synthetic_rollback_store","syntheticOnly":true,"identityFilename":".codex-memory-cm2102-store-identity.json","identityBytes":633,"identitySha256":"017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57","storeRootDerivation":{"schemaVersion":1,"authority":"git_common_dir_governance_state","governanceRootIdentityReference":"codex-memory-phase8-governance-root","governanceRootIdentitySha256":"240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0","governanceRootIdentityVerificationRequired":true,"governanceRootReinitializationAllowed":false,"governanceRootReplacementAllowed":false,"governanceParentSubdir":"codex-memory-governance","storeDirectoryName":"phase8-identity-bound-synthetic-rollback-store-001","callerPathAllowed":false,"environmentPathOverrideAllowed":false,"rawPathDisclosureAllowed":false,"parentDirectoryMustAlreadyExist":true,"storeDirectoryMustBeAbsentBeforeBootstrap":true,"storeDirectoryCreateMode":"exclusive_mkdir","identityCreateMode":"exclusive_create_only"},"storeRootBinding":{"authority":"git_common_dir_governance_state","governanceRootIdentityReference":"codex-memory-phase8-governance-root","governanceRootIdentitySha256":"240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0","lifecycleReference":"phase8-identity-bound-rollback-lifecycle-001","schemaVersion":1,"storeDirectoryName":"phase8-identity-bound-synthetic-rollback-store-001","storeIdentitySha256":"017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57","storeInstanceId":"phase8-identity-bound-synthetic-rollback-store-instance-001","storeReference":"phase8-identity-bound-synthetic-rollback-store-001"},"storeRootBindingCanonicalBytes":616,"storeRootBindingSha256":"0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94","governanceRootIdentity":{"registryRootInstanceId":"cm2093-phase8-governance-root-instance-001","registryRootReference":"codex-memory-phase8-governance-root","registryRootReinitializationAllowed":false,"registryRootReplacementAllowed":false},"governanceRootIdentitySha256":"240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0","authorizationRegistryIdentity":{"authorizationRegistryReference":"cm2103-identity-bound-store-bootstrap-registry-001","claimStorageModel":"single_atomic_claim_envelope_in_existing_governance_root","lifecycleReference":"phase8-identity-bound-rollback-lifecycle-001","registryDirectoryCreatedByClaim":false,"registryIdentityWrittenByClaim":false,"registryStorageRole":"durable-local-governance-state","schemaVersion":3,"storeRootBindingSha256":"0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94"},"authorizationRegistryIdentitySha256":"1b8052260640013b9fa60dd3615001d81df9f450a5d1fe046d3eb3ffcab65446","claimStorageModel":"single_atomic_claim_envelope_in_existing_governance_root","singleClaimEnvelopeAtomicCreateRequired":true,"actionRegistryDirectoryCreatedByClaim":false,"actionRegistryIdentityWrittenByClaim":false,"nonceMarkerWrites":0,"receiptMarkerWrites":0,"separateClaimRecordWrites":0,"successPartialAmbiguousReceiptUnionImplemented":true,"receiptVariants":["CLAIM_REGISTRY_AMBIGUOUS","CONSUMED_SUCCESS","CONSUMED_PARTIAL_BOOTSTRAP","CONSUMED_AMBIGUOUS"],"tristateEffectFields":["storeDirectoryCreated","identityWriteAttempted","identityCreated","identityBytes","identitySha256","identityReadbackMatched"],"filesystemFaultInjectionTestPath":"tests/cm2103-bootstrap-filesystem-fault-injection.test.js","filesystemFaultInjectionTestBlobOid":"2ba16a716ea48ee2d0482529930c09505dc200ce","filesystemFaultInjectionTestBytes":16897,"filesystemFaultInjectionTestSha256":"21057926a93056137619e9d47ccb29c7a5eec1e28e5c2d7342ec36292c941e91","filesystemFaultInjectionCases":["existing_store_unclaimed_stop","claim_write_before_create","claim_write_acknowledgement_lost","claim_terminal_state_persistence_failure","mkdir_acknowledgement_lost","identity_write_acknowledgement_lost","identity_readback_failure","directory_state_persistence_failure","identity_state_persistence_failure","success_state_persistence_failure","terminal_state_replay_reconstructed"],"nonce":"cm2102-identity-bound-store-bootstrap-001","receiptId":"cm2102-identity-bound-store-bootstrap-receipt-001","requestedExpiresAt":"2026-07-15T18:00:00+08:00","authorizationUseCount":1,"authorizationReplayAllowed":false,"stateSequence":["UNCLAIMED","CLAIMED","CLAIM_REGISTRY_AMBIGUOUS","STORE_DIRECTORY_CREATE_CONSUMED","STORE_DIRECTORY_CREATED","IDENTITY_WRITE_CONSUMED","IDENTITY_CREATED","IDENTITY_READBACK_CONSUMED","CONSUMED_SUCCESS","CONSUMED_PARTIAL_BOOTSTRAP","CONSUMED_AMBIGUOUS"],"maxStoreDirectoryCreates":1,"maxIdentityWrites":1,"maxIdentityReadbackVerifications":1,"maxDirectoryEnumerations":0,"maxRecordContentReads":0,"maxNativeReads":0,"maxNativeWrites":0,"maxRecordMemoryCalls":0,"maxTombstoneMemoryCalls":0,"maxVerifyOperations":0,"maxRetries":0,"maxClaimEnvelopeCreates":1,"governanceRegistryDirectoryCreates":0,"governanceRegistryIdentityWrites":0,"authorizationMarkerWrites":0,"parentDirectoryCreationAllowed":false,"identityOverwriteAllowed":false,"identityReplacementAllowed":false,"identityReinitializationAllowed":false,"identityDeletionAllowed":false,"automaticRetryAllowed":false,"automaticCleanupAllowed":false,"existingStoreDirectoryOutcome":"stop_without_read_delete_replace_or_reconcile","partialBootstrapOutcome":"stop_without_retry_cleanup_and_require_independent_reconciliation","ambiguousBootstrapOutcome":"stop_without_retry_cleanup_and_require_independent_reconciliation","futureDecisionPresentAtFreeze":false,"bootstrapExecutionAuthorizedAtFreeze":false,"storeDirectoryCreatedAtFreeze":false,"storeIdentityCreatedAtFreeze":false,"emptyStorePreflightAuthorizedAtFreeze":false,"emptyStorePreflightExecutedAtFreeze":false,"recordMemoryAuthorizedAtFreeze":false,"tombstoneMemoryAuthorizedAtFreeze":false,"verifyAuthorizedAtFreeze":false,"nonceClaimedAtFreeze":false,"receiptCreatedAtFreeze":false,"nativeReadsAtFreeze":0,"nativeWritesAtFreeze":0,"governanceFilesystemEffectsAtFreeze":0,"rollbackOrCompensationOperationsAtFreeze":0,"rollbackDrillPassed":false,"failureRecoveryProofPassed":false,"phase8Completed":false,"fullPlanPackCompleted":false,"readinessClaimed":false,"readyForImplementationReview":true,"readyForBootstrapAuthorizationReview":false,"executionBlockersAtFreeze":["future_exact_bootstrap_decision_absent","bootstrap_execution_not_authorized","store_directory_creation_not_authorized","store_identity_creation_not_authorized"],"packetPayloadSha256":"5da91016365599346dad93cac7ed16a2012730dcf613d3349e728188ce72d0b1","r2ReviewDecisionReference":"CM-2103-R1-ER-20260711-CHANGES-REQUIRED-DURABLE-REENTRY-INCOMPLETE-175ECE43","r2ReviewDecisionSourceCommit":"a0191b2be4eb7ef44e5919e9af89d3d31c373c93","r2ReviewDecisionSourceTree":"01016e0fe7eb332056657200ce44ed8047c941a1","r2ReviewDecisionPath":"docs/near-model-memory-plan-pack/phase8_bootstrap_executor_review_decision_cm2103_r2.json","r2ReviewDecisionBlobOid":"df4fc6d519be7208c68752f71eb67fc376e114f8","r2ReviewDecisionBytes":4393,"r2ReviewDecisionSha256":"4dfe57dcee82c8a1ac34c7717590cf5e1ef57aabf6804f316ef6871a15daddce","r2ReviewDecisionPayloadSha256":"dd8c65de44e38f5245e1cfe9b575baa208f6d077c7c9bca5a5f79e3ae2bf6d4d","durableClaimReentryImplemented":true,"terminalReceiptReconstructionImplemented":true,"nonterminalClaimProjectionImplemented":true,"corruptEnvelopeLowDisclosureProjectionImplemented":true,"governanceFilesystemEffectsTristateImplemented":true,"governanceFilesystemEffectFields":["governanceFilesystemEffectAttempted","governanceFilesystemEffectsPresent"],"reentryTerminalStatePersistenceAllowed":false,"reentryMayReplayBootstrap":false,"reentryMayCreateStoreEffects":false,"reentryOutcomeStages":["reentry_nonterminal_claimed","reentry_nonterminal_store_directory_create_consumed","reentry_nonterminal_store_directory_created","reentry_nonterminal_identity_write_consumed","reentry_nonterminal_identity_created","reentry_nonterminal_identity_readback_consumed","reentry_existing_claim_registry_ambiguous","reentry_existing_consumed_success","reentry_existing_consumed_partial_bootstrap","reentry_existing_consumed_ambiguous","reentry_existing_claim_unreadable_or_corrupt"],"maxStoreFilesystemAccessesDuringReentry":0,"maxStoreFilesystemWritesDuringReentry":0,"durableReentryTestPath":"tests/cm2103-bootstrap-durable-reentry.test.js","durableReentryTestBlobOid":"46d00af10bdca40f26f236e690945001edd39707","durableReentryTestBytes":18998,"durableReentryTestSha256":"a08cbac7a040c2155271cea3327995e4e54c60fcf7b4880f96e553e7b7f8776d","durableReentryCases":["claim_envelope_persistence_unknown","new_process_reentry_after_claimed","all_nonterminal_claim_receipt_projections","corrupt_claim_low_disclosure_ambiguous_receipt","unreadable_claim_low_disclosure_ambiguous_receipt","persisted_claim_registry_ambiguous_receipt_reconstruction","persisted_success_receipt_reconstruction","reentry_zero_target_store_effects","governance_filesystem_effect_presence_tristate"]}
```

## Non-claims

该 R2 packet 只证明 durable re-entry、persistence-unknown 三值保真和低披露 receipt
重建的非执行实现已准备好重新审查。它不证明 bootstrap 已执行，不授权 store / identity
创建、empty-store preflight、record、tombstone 或 verify，也不改变
`rollbackDrillPassed`、`failureRecoveryProofPassed`、`phase8Completed`、完整计划包或
readiness 状态。
