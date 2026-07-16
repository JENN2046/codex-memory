# CM-2115-R1 Phase 2 Completion Audit Application Decision

Decision reference: `CM-2115-R1-SELF-PHASE2-COMPLETION-AUDIT-APPLICATION-2215BB33`

This decision authorizes exactly one low-disclosure repository evidence application.
It authorizes no native/runtime/memory/remote action and keeps independent review,
full-plan completion, and readiness false.

## Exact JSON mirror

```json
{
  "canonicalPayloadSha256": "854b283b0f8e4d777499f8d5ed3076cbfd79c3d7d25db274231655cd221f7f94",
  "decisionType": "phase2_completion_audit_application_decision_v1",
  "payload": {
    "acceptedExternalReview": {
      "blobOid": "cee6321853e531b465458bc0286a613245054b5b",
      "bytes": 3563,
      "canonicalPayloadSha256": "2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2",
      "decisionReference": "CM-2080-ER-20260711-PASS-F440C1BD-2215BB33",
      "sha256": "f022a5e88b22b824b35d9cccd0627ad00b2923b1dbae8e4463b41c3c27f5dc4e",
      "sourceCommit": "88d11e94dc238145ba9317589cebda52f73910e1",
      "sourcePath": "docs/near-model-memory-plan-pack/external_review_final_decision_cm2080.json",
      "sourceTree": "a9e5cc8fe05af8518da1e29288d0e7fa71dfab2c"
    },
    "acceptedMachineEvidence": {
      "machineExecutionContractMustPass": true,
      "oldCm2074ApplicationMayActAsCurrentAuthority": false,
      "phase2Manifest": {
        "blobOid": "4ccc78ad3cdd2489d10ab0d6a680bbca9ce4e592",
        "bytes": 6937,
        "sha256": "9697fec7e60ac3a51f9339e1dd4694075f818940007cbc653c89f5ca01ce0e03",
        "sourceCommit": "c0b8c24eb89efdd76305dc725b5416f7ce46a3a1",
        "sourcePath": "docs/near-model-memory-plan-pack/phase2_machine_execution_evidence_manifest.json",
        "sourceTree": "bf5bbdaf47a7f05988d8e8d1b8ab4479e1a65ae4"
      },
      "windowsWslReceipt": {
        "blobOid": "83bca87e0c06a08046eb88d1fac55418c0ad37fd",
        "bytes": 795,
        "sha256": "60b38d4025d567aa8ac7b839b00aa3539884d67450647157cbe22b9c2363718d",
        "sourceCommit": "c0b8c24eb89efdd76305dc725b5416f7ce46a3a1",
        "sourcePath": "docs/near-model-memory-plan-pack/windows_wsl_machine_smoke_receipt.json",
        "sourceTree": "bf5bbdaf47a7f05988d8e8d1b8ab4479e1a65ae4"
      }
    },
    "allowedStateAfterApplication": {
      "fullPlanPackCompleted": false,
      "independentReviewPassed": false,
      "phase2GovernedNativeReadEvidenceApplicationPassed": true,
      "phase2ReceiptBundleAppliedToCompletionAudit": true,
      "readinessClaimed": false
    },
    "applicationSideEffectLimits": {
      "completionAuditPatchApplications": 1,
      "durableMutations": 0,
      "nativeReads": 0,
      "nativeWrites": 0,
      "providerCalls": 0,
      "readinessClaims": 0,
      "realMemoryReads": 0,
      "remoteActions": 0
    },
    "authority": {
      "applicationAuthorized": true,
      "authorityClass": "jenn_direct_exact_repository_evidence_application",
      "authorityReference": "JENN-CM2115-R1-20260712",
      "authorizationReplayAllowed": false,
      "authorizationUseCount": 1,
      "rawApprovalMaterialStored": false
    },
    "decisionReference": "CM-2115-R1-SELF-PHASE2-COMPLETION-AUDIT-APPLICATION-2215BB33",
    "decisionType": "phase2_machine_evidence_completion_audit_application_decision",
    "nonClaims": {
      "completeV8": false,
      "cutoverReady": false,
      "deployReady": false,
      "fullPlanPackCompleted": false,
      "productionReady": false,
      "rcReady": false,
      "readinessClaimed": false,
      "releaseReady": false
    },
    "requiredEvidencePatch": {
      "auditReceiptPassed": true,
      "fallbackDistinctionPassed": true,
      "lowDisclosureProofPassed": true,
      "nativeReadProofPassed": true,
      "nativeTargetBindingPassed": true,
      "phase2ReceiptBundleAppliedToCompletionAudit": true,
      "scopeVisibilityIsolationPassed": true,
      "windowsWslSmokePassed": true,
      "wslLinuxProofPassed": true
    }
  },
  "schemaVersion": 1,
  "taskId": "CM-2115-R1"
}
```
