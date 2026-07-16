# CM-2100 Target-store Bootstrap Authorization Request Canonical Review Surface

本审查面完整呈现 CM-2100 申请 JSON，并绑定其来源提交。它只用于独立只读审查，
不授权 identity 创建、preflight、nonce claim、native memory action 或 verify。

## 申请提交绑定

```yaml
application_commit: "ca43959b22cc36f35398fae0a37e6ac432265726"
application_tree: "82f6ca389a0bd53cf40c4af097e8a82b1ec488d6"

json_path: "docs/near-model-memory-plan-pack/phase8_target_store_identity_bootstrap_authorization_request_cm2100.json"
json_blob_oid: "12c1857a78ed85cb4721d60660efafb0d67b524a"
json_bytes: 6336
json_sha256: "03b54155f1033fff671b7f723acbb9b70a26183cec2263d0120161b7302d999f"
json_payload_sha256: "dbb1783ec35ce4eb90219f83b49c971217f8791233bb594fd3b7d4af9b534d10"

markdown_path: "docs/near-model-memory-plan-pack/phase8_target_store_identity_bootstrap_authorization_request_cm2100.md"
markdown_blob_oid: "1624a5f09d6fb36cc3829bd31dcbb503b81b3237"
markdown_bytes: 7693
markdown_sha256: "9d7c5639107b97ff5c1ae218ae45d8c926457e4858682dacc4290b123b0a114a"
```

## 前置决定冻结绑定

```yaml
decision_reference: "CM-2096-ER-20260711-V3-IMPLEMENTATION-PASS-NO-EXECUTION-75FAFECD"
decision_source_commit: "1179eb919f24da455521a85e12f9f093f9d9d3fa"
decision_source_tree: "ae7dcad2799fa043f7f6d8a4587cad15711b5993"
decision_blob_oid: "fecb6baee648d87beec7c9262b2ae9ee086135f7"
decision_bytes: 11698
decision_sha256: "ae54dc7d2034d031c39f5bce1fa3d8123cdb931f764d9bac089fdf029d68947b"
```

## 完整机器申请对象

```json
{
  "schemaVersion": 1,
  "taskId": "CM-2100",
  "rollbackTaskId": "CM-2096",
  "requestType": "cm2096_target_store_identity_bootstrap_authorization_request",
  "requestPurpose": "request_exact_one_shot_exclusive_create_authorization_for_cm2096_target_store_identity_only",
  "requestedAt": "2026-07-11",
  "priorReviewDecisionReference": "CM-2096-ER-20260711-V3-IMPLEMENTATION-PASS-NO-EXECUTION-75FAFECD",
  "priorReviewDecisionPath": "docs/near-model-memory-plan-pack/phase8_rollback_execution_packet_cm2096_v3_review_decision.md",
  "priorReviewDecisionSourceCommit": "1179eb919f24da455521a85e12f9f093f9d9d3fa",
  "priorReviewDecisionSourceTree": "ae7dcad2799fa043f7f6d8a4587cad15711b5993",
  "priorReviewDecisionBlobOid": "fecb6baee648d87beec7c9262b2ae9ee086135f7",
  "priorReviewDecisionBytes": 11698,
  "priorReviewDecisionSha256": "ae54dc7d2034d031c39f5bce1fa3d8123cdb931f764d9bac089fdf029d68947b",
  "implementationCommit": "6f4f7867e8260fc79113239de4ff8d73b1425de9",
  "implementationTree": "c9247b19a9d84e170f62ced27a190051bbeb7a3a",
  "executionPacketCommit": "1ba07b0cfab17da432a860e2c640569288e626e0",
  "executionPacketTree": "f0919cf536bba3d965979cdf0f65f8b5f31bbd93",
  "executionPacketBlobOid": "74c42292f61dcf7e6033207c573a878f6f1ea64c",
  "executionPacketBytes": 7879,
  "executionPacketSha256": "75fafecd9b5be4195aef83328bb5d18ab9f3bf33502a731d79a05c04287d9768",
  "executionPacketPayloadSha256": "0b925a72d24deb004112b0f847c8b70cc533f0d84a91f11eda78e435aefa097d",
  "cm2094ExecutionReceiptReviewReference": "CM-2094-ER-20260711-NATIVE-WRITE-RECEIPT-PASS-FD22CEC6",
  "cm2094ExecutionReceiptCommit": "91c20ce4c9b85966ef2da6b7c37563ebbce0f365",
  "cm2094ExecutionReceiptBlobOid": "b310146b5219cb4db0e463275f10e8aae4d2f94a",
  "cm2094ExecutionReceiptBytes": 3078,
  "cm2094ExecutionReceiptSha256": "fd22cec67c8d95eab2f95c10a52207529847d83942354331ba372f5edc41f277",
  "targetStoreReference": "cm2094-phase8-synthetic-native-write-store",
  "targetStoreRole": "cm2094_synthetic_native_write_store",
  "targetStoreSyntheticOnly": true,
  "targetMemoryIdRef": "vcp-kb-4f863f52455147c6",
  "targetRecordBytes": 269,
  "targetRecordSha256": "4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828",
  "targetStoreIdentityTemplatePath": "docs/near-model-memory-plan-pack/cm2096_target_store_identity.json",
  "targetStoreIdentityTemplateCommit": "1ba07b0cfab17da432a860e2c640569288e626e0",
  "targetStoreIdentityTemplateBlobOid": "3d4ee2e174c9967afc59b179b15b1347505613e3",
  "targetStoreIdentityTemplateFileBytes": 577,
  "targetStoreIdentityTemplateFileSha256": "771641f45588e5c58d068bd2ef3e7d48f0494a8871ee11329f5f5c3e076c6e33",
  "targetStoreIdentityRuntimeFilename": ".codex-memory-cm2096-store-identity.json",
  "targetStoreIdentityRuntimeBytes": 576,
  "targetStoreIdentityRuntimeSha256": "e28d9b2ffae919aeb2f49a5882badac92a0df20d6886400137cdbf3527000a13",
  "targetStoreIdentityRuntimeEncoding": "utf8_minified_no_bom_no_trailing_newline",
  "bootstrapAction": "initialize_cm2096_target_store_identity",
  "bootstrapCreateMode": "exclusive_create_only",
  "bootstrapParentDirectoryCreationAllowed": false,
  "bootstrapOverwriteAllowed": false,
  "bootstrapReplacementAllowed": false,
  "bootstrapReinitializationAllowed": false,
  "bootstrapDeletionAllowed": false,
  "bootstrapAuthorizationRequested": true,
  "bootstrapMayExecuteFromThisRequest": false,
  "bootstrapAuthorizationUseCount": 1,
  "bootstrapAuthorizationReplayAllowed": false,
  "bootstrapNonce": "cm2100-cm2096-target-store-bootstrap-001",
  "bootstrapReceiptId": "cm2100-cm2096-target-store-bootstrap-receipt-001",
  "requestedExpiresAt": "2026-07-15T18:00:00+08:00",
  "runtimeStoreAuthoritySourceRequired": true,
  "storeRootBindingSha256Required": true,
  "cm2094OriginalStoreContinuityRequired": true,
  "cloneStoreAcceptedAsCm2094OriginalStore": false,
  "runtimeStoreAuthorityBindingPresentAtRequest": false,
  "storeRootBindingSha256PresentAtRequest": false,
  "cm2094OriginalStoreContinuityProvenAtRequest": false,
  "reviewerMustFailClosedWithoutExactStoreBinding": true,
  "physicalTargetStoreStateObservedByThisRequest": false,
  "targetStoreIdentityBootstrapReceiptPresent": false,
  "targetStorePreflightAuthorizationRequested": false,
  "targetStorePreflightExecuted": false,
  "targetRecordReadAuthorized": false,
  "targetStoreDirectoryEnumerationAuthorized": false,
  "nativeReadAuthorized": false,
  "nativeWriteAuthorized": false,
  "recordMemoryAuthorized": false,
  "tombstoneMemoryAuthorized": false,
  "supersedeMemoryAuthorized": false,
  "verifyAuthorized": false,
  "tombstoneNonceClaimAuthorized": false,
  "tombstoneExecutionReceiptCreationAuthorized": false,
  "rollbackOrCompensationAuthorized": false,
  "automaticRetryAuthorized": false,
  "automaticRollbackAuthorized": false,
  "realMemoryReadAuthorized": false,
  "existingRealMemoryModificationAuthorized": false,
  "rawPrivateMemoryAccessAuthorized": false,
  "rawPathDisclosureAuthorized": false,
  "defaultMcpExpansionAuthorized": false,
  "remoteGitActionAuthorized": false,
  "releaseDeployCutoverAuthorized": false,
  "readinessClaimAuthorized": false,
  "maxBootstrapIdentityWrites": 1,
  "maxIdentityReadbackVerifications": 1,
  "maxTargetRecordReads": 0,
  "maxTargetStoreDirectoryEnumerations": 0,
  "maxNativeReads": 0,
  "maxNativeWrites": 0,
  "maxTombstoneWrites": 0,
  "maxVerifyOperations": 0,
  "maxRetries": 0,
  "maxSupersedeOperations": 0,
  "maxCompensationOperations": 0,
  "existingIdentityOutcome": "stop_without_read_overwrite_delete_or_reconcile",
  "missingOrMismatchedStoreAuthorityOutcome": "stop_before_identity_creation",
  "ambiguousBootstrapOutcome": "stop_without_retry_and_request_separate_reconciliation",
  "bootstrapReceiptRequired": true,
  "bootstrapReceiptIndependentReviewRequired": true,
  "bootstrapAuthorizationCurrentlyGranted": false,
  "bootstrapAuthorizationConsumed": false,
  "identityCreatedByThisRequest": false,
  "preflightPerformedByThisRequest": false,
  "nonceClaimedByThisRequest": false,
  "nativeActionPerformedByThisRequest": false,
  "rollbackDrillPassed": false,
  "failureRecoveryProofPassed": false,
  "phase8Completed": false,
  "fullPlanPackCompleted": false,
  "readinessClaimed": false,
  "requestPayloadSha256": "dbb1783ec35ce4eb90219f83b49c971217f8791233bb594fd3b7d4af9b534d10"
}
```

## 审查解释边界

```yaml
bootstrap_authorization_requested: true
bootstrap_authorization_granted_by_this_surface: false
bootstrap_may_execute_from_this_surface: false

runtime_store_authority_binding_present_at_request: false
store_root_binding_sha256_present_at_request: false
cm2094_original_store_continuity_proven_at_request: false
reviewer_must_fail_closed_without_exact_store_binding: true

target_store_preflight_authorized: false
target_record_read_authorized: false
nonce_claim_authorized: false
native_write_authorized: false
tombstone_memory_authorized: false
verify_authorized: false

identity_created: false
preflight_executed: false
native_actions: 0
rollbackDrillPassed: false
phase8Completed: false
readinessClaimed: false
```

本审查面不要求也不允许审查者读取原始记忆、物理 store 路径、endpoint、token、
provider payload 或原始 audit row。若无法通过低披露证据证明 CM-2094 原 store
连续性，正确结果是 `changes_required`，不是概括性批准。
