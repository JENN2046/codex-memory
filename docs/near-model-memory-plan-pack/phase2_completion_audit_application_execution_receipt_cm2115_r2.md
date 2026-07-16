# CM-2115-R2 Phase 2 Exact Patch Execution Receipt

Canonical payload SHA-256: `146824fe278b57d4bfa0a1906b9bd603416c9e0033886eb58499ede56c280a9c`

This execution receipt requires a separate Git application binding receipt.
It does not by itself set phase2ReceiptBundleAppliedToCompletionAudit.

## Exact JSON mirror

```json
{
  "canonicalPayloadSha256": "146824fe278b57d4bfa0a1906b9bd603416c9e0033886eb58499ede56c280a9c",
  "payload": {
    "application": {
      "applicationCommitBindingRequired": true,
      "applicationCommitBoundByThisReceipt": false,
      "baselineCommit": "f458277d0d929c4fcf24748ac56ee63eca186558",
      "baselineTree": "7e4503756c4f748f5c452b97e61659d08483ffd1",
      "exactEvidencePatchApplied": {
        "auditReceiptPassed": true,
        "fallbackDistinctionPassed": true,
        "lowDisclosureProofPassed": true,
        "nativeReadProofPassed": true,
        "nativeTargetBindingPassed": true,
        "phase2ReceiptBundleAppliedToCompletionAudit": true,
        "scopeVisibilityIsolationPassed": true,
        "windowsWslSmokePassed": true,
        "wslLinuxProofPassed": true
      },
      "patchPayloadSha256": "6c29d2e402d1a8e974ba7b6037b8c587d126bb58533e6de319574764136152d8",
      "targets": [
        {
          "after": {
            "blobOid": "49dd3a39ef4796cdf587b3d5394ef6add78172b1",
            "bytes": 60686,
            "gitMode": "100644",
            "sha256": "c791409aca283f546ab013f058c4ae98fa1b74e9574c1c6040e1ab516b624091"
          },
          "before": {
            "blobOid": "1daef69d5d5d0dfbf928d86cb1f32cd01852e8d0",
            "bytes": 60051,
            "gitMode": "100644",
            "sha256": "81808a1ed0356bbd1829d2576ddba2bea54b6b8e8f85bdfc992ae3eaa5c964c9"
          },
          "operation": "modify",
          "sourcePath": "docs/near-model-memory-plan-pack/completion_audit_report.md"
        },
        {
          "after": {
            "blobOid": "4cd86ef5efada6c3f927da923fe7d4dad73d26b4",
            "bytes": 34125,
            "gitMode": "100644",
            "sha256": "339bd48cba47ae02ac7dc60227bec8565880912d817b1da20161458fec71ccd0"
          },
          "before": {
            "blobOid": "374e1b1f2aabfdd0f942beac7c7b74fa7b7ab05f",
            "bytes": 33654,
            "gitMode": "100644",
            "sha256": "df3ab5ad216bcb9004cef46320b0ae02d27239c05d890e22732d89aeb00537c6"
          },
          "operation": "modify",
          "sourcePath": "docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md"
        },
        {
          "after": {
            "blobOid": "00426318115ca3b531b139437820b2150ee4d931",
            "bytes": 8810,
            "gitMode": "100644",
            "sha256": "52a8953f6030fc5d69fa2b3a8f4dbc9c547f94ce53d1fce488717a2f29e954df"
          },
          "before": {
            "blobOid": "5a2e8b52db8b9c563f08949e1ac6eab61825fda2",
            "bytes": 8399,
            "gitMode": "100644",
            "sha256": "1b687768f339acd332f4a65f5c5ccb7f024faa03dec2d5c687034c9ea1c84173"
          },
          "operation": "modify",
          "sourcePath": "docs/near-model-memory-plan-pack/06_ACCEPTANCE_MATRIX.md"
        },
        {
          "after": {
            "blobOid": "28d9962c13c6e80bf90bdb8b88f32eed3126d58a",
            "bytes": 19139,
            "gitMode": "100644",
            "sha256": "eea322dceed7e38dfaf3380fca194edd47fac2bb6ad4cc0564b076681a612e7d"
          },
          "before": {
            "blobOid": "0557922361d899d8aa030a06341fb74450893306",
            "bytes": 18808,
            "gitMode": "100644",
            "sha256": "cd0730dc66816db95497b69d51acddbb6c0cff02f77a726a64fb26b91c53ddfe"
          },
          "operation": "modify",
          "sourcePath": "docs/near-model-memory-plan-pack/07_CAPABILITY_MATRIX.md"
        },
        {
          "after": {
            "blobOid": "af903c7e3b31166f1923b09831102f9806932b32",
            "bytes": 1272,
            "gitMode": "100644",
            "sha256": "9a5fdbf6e095d3f89e588867be65867aa21816da78d5227119381039f723fcbe"
          },
          "before": null,
          "operation": "add",
          "sourcePath": "docs/near-model-memory-plan-pack/phase2_completion_audit_application_state_cm2115_r2.json"
        }
      ]
    },
    "authority": {
      "blobOid": "d64ca132e67f84c87c80c2d6208e590b155fc1d3",
      "bytes": 1262,
      "gitMode": "100644",
      "gitObjectType": "blob",
      "reference": "JENN-CM2115-R2-20260712",
      "sha256": "8247e79893a64efe5f3a111fbf202754273a7b2a0a23e6358af47afc4a30f122",
      "sourceCommit": "f458277d0d929c4fcf24748ac56ee63eca186558",
      "sourcePath": "docs/near-model-memory-plan-pack/phase2_completion_audit_application_authority_intake_cm2115_r2.json",
      "sourceTree": "7e4503756c4f748f5c452b97e61659d08483ffd1"
    },
    "currentState": {
      "fullPlanPackCompleted": false,
      "independentReviewPassed": false,
      "phase2ReceiptBundleAppliedToCompletionAudit": false,
      "readinessClaimed": false
    },
    "decision": {
      "blobOid": "f8811955247b8ca0349ac82e5f173b42f92c4a02",
      "bytes": 7497,
      "gitMode": "100644",
      "gitObjectType": "blob",
      "reference": "CM-2115-R2-DIRECT-PHASE2-EXACT-PATCH-APPLICATION-2215BB33",
      "sha256": "cf0b0704258e5d5d2b84cb80736bb97186de783f2aa4409f6265ea18e725dcb2",
      "sourceCommit": "c8dbbcd8c0abaa2aeb389ca388a66a570871f07f",
      "sourcePath": "docs/near-model-memory-plan-pack/phase2_completion_audit_application_decision_cm2115_r2.json",
      "sourceTree": "eb05f879d95b1c052ba07c90778a484bccc1181a"
    },
    "receiptType": "phase2_exact_patch_application_execution_receipt_v1",
    "registry": {
      "authorizationConsumed": true,
      "authorizationReplayAllowed": false,
      "authorizationUseCount": 1,
      "bindingHash": "8ec9206dc2dad88f7fb88302c30bae6113b7ec0b909f37354c56c50d8f253ebc",
      "claimId": "2dca80c9a3a88fdf7c6814964ffc3ca89efa89dcafa6252172995fdeccf36b16",
      "finalStateRequired": "CONSUMED_SUCCESS",
      "patchInvocationCount": 1,
      "registryReference": "cm2115-r2-phase2-completion-audit-application-registry-001"
    },
    "schemaVersion": 1,
    "sideEffects": {
      "completionAuditPatchApplications": 1,
      "nativeReads": 0,
      "nativeWrites": 0,
      "providerCalls": 0,
      "readinessClaims": 0,
      "realMemoryReads": 0,
      "remoteActions": 0
    },
    "taskId": "CM-2115-R2",
    "upstream": {
      "cm2080": {
        "blobOid": "cee6321853e531b465458bc0286a613245054b5b",
        "bytes": 3563,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "f022a5e88b22b824b35d9cccd0627ad00b2923b1dbae8e4463b41c3c27f5dc4e",
        "sourceCommit": "88d11e94dc238145ba9317589cebda52f73910e1",
        "sourcePath": "docs/near-model-memory-plan-pack/external_review_final_decision_cm2080.json",
        "sourceTree": "a9e5cc8fe05af8518da1e29288d0e7fa71dfab2c"
      },
      "phase2Manifest": {
        "blobOid": "4ccc78ad3cdd2489d10ab0d6a680bbca9ce4e592",
        "bytes": 6937,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "9697fec7e60ac3a51f9339e1dd4694075f818940007cbc653c89f5ca01ce0e03",
        "sourceCommit": "c0b8c24eb89efdd76305dc725b5416f7ce46a3a1",
        "sourcePath": "docs/near-model-memory-plan-pack/phase2_machine_execution_evidence_manifest.json",
        "sourceTree": "bf5bbdaf47a7f05988d8e8d1b8ab4479e1a65ae4"
      },
      "windowsWslReceipt": {
        "blobOid": "83bca87e0c06a08046eb88d1fac55418c0ad37fd",
        "bytes": 795,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "60b38d4025d567aa8ac7b839b00aa3539884d67450647157cbe22b9c2363718d",
        "sourceCommit": "c0b8c24eb89efdd76305dc725b5416f7ce46a3a1",
        "sourcePath": "docs/near-model-memory-plan-pack/windows_wsl_machine_smoke_receipt.json",
        "sourceTree": "bf5bbdaf47a7f05988d8e8d1b8ab4479e1a65ae4"
      }
    }
  },
  "receiptType": "phase2_exact_patch_application_execution_receipt_v1",
  "schemaVersion": 1,
  "taskId": "CM-2115-R2"
}
```
