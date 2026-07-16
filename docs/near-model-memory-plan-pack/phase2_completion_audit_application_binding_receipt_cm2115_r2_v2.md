# CM-2115-R2 Strengthened Phase 2 Application Binding Receipt

Application commit: `49979a55dcee30c11f2bb13ea07d1cbf1e8024f1`
Canonical payload SHA-256: `95945eebb2f383eb089ae58cbd31f5105fc56b5ffbde4bf440343761979c6b89`

This v2 receipt additionally binds the exact execution-receipt Markdown
blob and uses typed Git path-state verification for the add-only target.
It performs no patch, native-memory, provider, real-memory, or remote action.

## Exact JSON mirror

```json
{
  "canonicalPayloadSha256": "95945eebb2f383eb089ae58cbd31f5105fc56b5ffbde4bf440343761979c6b89",
  "payload": {
    "application": {
      "commit": "49979a55dcee30c11f2bb13ea07d1cbf1e8024f1",
      "diffPathsSha256": "353c31b3d6a52bdc598b735911056c1eff4cafc6c2df05a2569ef08d200b83b8",
      "parentCommit": "c8dbbcd8c0abaa2aeb389ca388a66a570871f07f",
      "parentTree": "eb05f879d95b1c052ba07c90778a484bccc1181a",
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
      ],
      "tree": "07d6c45f23a43815200a1cb304762152c920e35c"
    },
    "appliedEvidence": {
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
    "currentState": {
      "fullPlanPackCompleted": false,
      "independentReviewPassed": false,
      "phase2ReceiptBundleAppliedToCompletionAudit": true,
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
    "executionReceipt": {
      "blobOid": "fae832c3dc3f8ff563d2ff2dc0ad600aa998764e",
      "bytes": 7754,
      "gitMode": "100644",
      "gitObjectType": "blob",
      "sha256": "7cbd5d00ff501e12f9c8f6645e1709e40237b05e5fa1035758b2fd830d04af68",
      "sourceCommit": "49979a55dcee30c11f2bb13ea07d1cbf1e8024f1",
      "sourcePath": "docs/near-model-memory-plan-pack/phase2_completion_audit_application_execution_receipt_cm2115_r2.json",
      "sourceTree": "07d6c45f23a43815200a1cb304762152c920e35c"
    },
    "executionReceiptMarkdown": {
      "blobOid": "b2dec81da10c0ea65b8768182403467f6f142a71",
      "bytes": 8083,
      "gitMode": "100644",
      "gitObjectType": "blob",
      "sha256": "aadfd54ce97aeb3e2f3b6724e8f794ccb7473d6a11670937ce24c97e07b7dfee",
      "sourceCommit": "49979a55dcee30c11f2bb13ea07d1cbf1e8024f1",
      "sourcePath": "docs/near-model-memory-plan-pack/phase2_completion_audit_application_execution_receipt_cm2115_r2.md",
      "sourceTree": "07d6c45f23a43815200a1cb304762152c920e35c"
    },
    "receiptType": "phase2_exact_patch_application_git_binding_receipt_v2",
    "registry": {
      "authorizationConsumed": true,
      "authorizationReplayAllowed": false,
      "authorizationUseCount": 1,
      "bindingHash": "8ec9206dc2dad88f7fb88302c30bae6113b7ec0b909f37354c56c50d8f253ebc",
      "claimId": "2dca80c9a3a88fdf7c6814964ffc3ca89efa89dcafa6252172995fdeccf36b16",
      "finalState": "CONSUMED_SUCCESS",
      "patchInvocationCount": 1,
      "registryReference": "cm2115-r2-phase2-completion-audit-application-registry-001"
    },
    "schemaVersion": 1,
    "sideEffects": {
      "nativeReads": 0,
      "nativeWrites": 0,
      "providerCalls": 0,
      "readinessClaims": 0,
      "realMemoryReads": 0,
      "remoteActions": 0
    },
    "taskId": "CM-2115-R2"
  },
  "receiptType": "phase2_exact_patch_application_git_binding_receipt_v2",
  "schemaVersion": 1,
  "taskId": "CM-2115-R2"
}
```
