# CM-2096 / CM-2097 Packet Canonical Read-Only Review Surface

主申请提交：`ffc07c504b388c06b816f021752e145c3a753a4f`；tree：`226482425cf2d5ae0cfb44274e3e0d09fdc5b815`。本文件为 ColaMeta 跳过 JSON 时提供内容等价审查面，不授权执行。

## CM-2096 Rollback Packet

原文件 2648 bytes，SHA-256 `51f21f60a1d0b2b9f6dc5cd759b1776f5d42f32266f37504047db1ad06860fdb`，blob `2995e642026ed56f499b420508a8e847f0ec31d9`。

```json
{"schemaVersion":1,"taskId":"CM-2096","routeDecisionReference":"CM-2096-ER-20260711-ROLLBACK-ROUTE-PASS-NO-EXECUTION-BB6EBB76","packetType":"rollback_semantic_and_execution_packet_non_executing","action":"tombstone_memory","exactApprovalAction":"live_bridge_tombstone_memory_proof","targetKind":"cm2094_synthetic_proof_record_only","targetBinding":{"executionReceiptCommit":"91c20ce4c9b85966ef2da6b7c37563ebbce0f365","durableRecordBytes":269,"durableRecordSha256":"4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828","rawPathDisclosed":false},"markerCanonicalObject":{"action":"tombstone_memory","appendOnly":true,"mutationMarkerOnly":true,"reasonCode":"cm2096_rollback_drill_synthetic_proof_record","target":{"durableRecordSha256":"4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828","executionReceiptCommit":"91c20ce4c9b85966ef2da6b7c37563ebbce0f365"}},"markerCanonicalBytes":301,"markerCanonicalSha256":"0407cbcfffce19c8b015f1d18c10735ebe3c45b348e62ec8b1e6e76de509e467","rollbackSemantics":{"model":"append_only_logical_tombstone","appendOnly":true,"originalRecordPreserved":true,"tombstoneMarkerRequired":true,"effectiveVisibilitySuppressionRequired":true,"physicalDeleteForbidden":true,"inPlaceOverwriteForbidden":true,"supersedeSelected":false},"markerAwareVerifyDesign":{"surface":"cm2096_marker_aware_effective_visibility_projection","implementationFrozen":false,"selectedFieldsOnly":true,"rawMemoryReturned":false,"rawAuditReturned":false,"requiredOutcomes":{"markerPersistedExactHash":true,"originalRecordBytesUnchanged":true,"effectiveLifecycleStatus":"tombstoned","governedRetrievalReturnsTargetAsEffectiveMemory":false,"otherRealMemoryRead":false,"otherRealMemoryModified":false}},"futureExecutionRequirements":{"frozenExecutorRequired":true,"exactTargetRequired":true,"uniqueNonceRequired":true,"uniqueReceiptRequired":true,"isolatedRegistryRequired":true,"independentActionSpecificAuthorizationRequired":true,"independentReceiptReviewRequired":true},"executionAuthorized":false,"tombstoneExecutionAuthorized":false,"verifyAuthorized":false,"rollbackDrillPassed":false,"failureRecoveryProofPassed":false,"phase8Completed":false,"nativeActionCount":0,"verifyOperationCount":0,"realMemoryReadCount":0,"existingRealMemoryModificationCount":0}
```

## CM-2097 Case A

原文件 1299 bytes，SHA-256 `4f53b125ee905fc763c930de7fa8284fad2b6a8a1cc2b0610fdfcba2af405683`，blob `6536f28856864d9fb5151fa3f612e639ea2911e1`。

```json
{"schemaVersion":1,"taskId":"CM-2097","routeDecisionReference":"CM-2097-ER-20260711-FAILURE-RECOVERY-ROUTE-PASS-NO-EXECUTION-C8DBFB58","manifestType":"isolated_synthetic_failure_case_non_executing","caseId":"pre_claim_failure_no_side_effect","failureStage":"before_authorization_claim","nonce":"cm2097-pre-claim-failure-001","receiptId":"cm2097-pre-claim-failure-receipt-001","registryReference":"cm2097-isolated-registry-pre-claim-001","expectedState":"UNCLAIMED","claimCount":0,"writeInvocationCount":0,"maxNativeWriteCalls":0,"maxDurableWrites":0,"isolatedRuntimeStoreRequired":true,"isolatedRegistryNamespaceRequired":true,"usesCm2094LiveAuthorization":false,"usesCm2094Nonce":false,"usesCm2094RegistryClaim":false,"modifiesCm2094Record":false,"productionProviderAllowed":false,"realMemoryAllowed":false,"localFallbackAllowed":false,"retryCount":0,"rollbackCount":0,"compensationCount":0,"authorizationReplayAllowed":false,"ordinaryCallerFailureStageOverrideAllowed":false,"arbitraryCallbackInjectionAllowed":false,"executionAuthorized":false,"nativeWriteAuthorized":false,"verifyAuthorized":false,"failureRecoveryProofPassed":false,"phase8Completed":false}
```

## CM-2097 Case B

原文件 1357 bytes，SHA-256 `e462017bae59580f1b06f41ef741133b361fdccb5e761ac913aad0dfbd7d102b`，blob `84dc26daef2df152faa7384dece9dca1ceb8cf9f`。

```json
{"schemaVersion":1,"taskId":"CM-2097","routeDecisionReference":"CM-2097-ER-20260711-FAILURE-RECOVERY-ROUTE-PASS-NO-EXECUTION-C8DBFB58","manifestType":"isolated_synthetic_failure_case_non_executing","caseId":"pre_commit_failure_consumes_claim_without_retry","failureStage":"after_authorization_claim_before_write_invocation","nonce":"cm2097-pre-commit-failure-001","receiptId":"cm2097-pre-commit-failure-receipt-001","registryReference":"cm2097-isolated-registry-pre-commit-001","expectedState":"CONSUMED_FAILED_PRE_COMMIT","claimCount":1,"writeInvocationCount":0,"maxNativeWriteCalls":0,"maxDurableWrites":0,"isolatedRuntimeStoreRequired":true,"isolatedRegistryNamespaceRequired":true,"usesCm2094LiveAuthorization":false,"usesCm2094Nonce":false,"usesCm2094RegistryClaim":false,"modifiesCm2094Record":false,"productionProviderAllowed":false,"realMemoryAllowed":false,"localFallbackAllowed":false,"retryCount":0,"rollbackCount":0,"compensationCount":0,"authorizationReplayAllowed":false,"ordinaryCallerFailureStageOverrideAllowed":false,"arbitraryCallbackInjectionAllowed":false,"executionAuthorized":false,"nativeWriteAuthorized":false,"verifyAuthorized":false,"failureRecoveryProofPassed":false,"phase8Completed":false}
```

## CM-2097 Case C

原文件 1382 bytes，SHA-256 `9c52b3a1b84cfb0494f49946caf72cbd1fe6d4cba424901af62eb8f234a2d5ca`，blob `98b145784c7319bae7c38f26dd42d38e0509d112`。

```json
{"schemaVersion":1,"taskId":"CM-2097","routeDecisionReference":"CM-2097-ER-20260711-FAILURE-RECOVERY-ROUTE-PASS-NO-EXECUTION-C8DBFB58","manifestType":"isolated_synthetic_failure_case_non_executing","caseId":"ambiguous_post_commit_stops_without_retry_or_compensation","failureStage":"after_durable_commit_before_acknowledgement","nonce":"cm2097-ambiguous-post-commit-001","receiptId":"cm2097-ambiguous-post-commit-receipt-001","registryReference":"cm2097-isolated-registry-ambiguous-post-commit-001","expectedState":"CONSUMED_AMBIGUOUS_POST_COMMIT","claimCount":1,"writeInvocationCount":1,"maxNativeWriteCalls":1,"maxDurableWrites":1,"isolatedRuntimeStoreRequired":true,"isolatedRegistryNamespaceRequired":true,"usesCm2094LiveAuthorization":false,"usesCm2094Nonce":false,"usesCm2094RegistryClaim":false,"modifiesCm2094Record":false,"productionProviderAllowed":false,"realMemoryAllowed":false,"localFallbackAllowed":false,"retryCount":0,"rollbackCount":0,"compensationCount":0,"authorizationReplayAllowed":false,"ordinaryCallerFailureStageOverrideAllowed":false,"arbitraryCallbackInjectionAllowed":false,"executionAuthorized":false,"nativeWriteAuthorized":false,"verifyAuthorized":false,"failureRecoveryProofPassed":false,"phase8Completed":false}
```
