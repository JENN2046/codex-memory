# CM-2120 Frozen cm2118_full_plan_application_commit_binding_receipt_v1

Raw bytes: `7546`
Raw SHA-256: `d5e610229545a1da55100bfb6e949d84bd8ffc59e207c5a9736281a3d9911fbb`
Canonical payload SHA-256: `1da21b7437e8accdb62a7d3f00320da74774e6f293ff4c384976b2d91cdc7fc6`

This is a low-disclosure, byte-exact repository mirror of the governed
receipt. It does not authorize status synchronization, native memory,
provider, remote, release, deployment, cutover, or readiness actions.

## Exact JSON mirror

```json
{
  "artifactType": "cm2118_full_plan_application_commit_binding_receipt_v1",
  "canonicalPayloadSha256": "1da21b7437e8accdb62a7d3f00320da74774e6f293ff4c384976b2d91cdc7fc6",
  "payload": {
    "application": {
      "commit": "41097b0fb1118a47f3d16873a12a5e0fcc75a94b",
      "exactDiffEntries": [
        {
          "path": "docs/near-model-memory-plan-pack/06_ACCEPTANCE_MATRIX.md",
          "status": "M"
        },
        {
          "path": "docs/near-model-memory-plan-pack/07_CAPABILITY_MATRIX.md",
          "status": "M"
        },
        {
          "path": "docs/near-model-memory-plan-pack/cm2116_full_plan_application_state.json",
          "status": "A"
        },
        {
          "path": "docs/near-model-memory-plan-pack/completion_audit_report.md",
          "status": "M"
        },
        {
          "path": "docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md",
          "status": "M"
        }
      ],
      "exactDiffPaths": [
        "docs/near-model-memory-plan-pack/06_ACCEPTANCE_MATRIX.md",
        "docs/near-model-memory-plan-pack/07_CAPABILITY_MATRIX.md",
        "docs/near-model-memory-plan-pack/cm2116_full_plan_application_state.json",
        "docs/near-model-memory-plan-pack/completion_audit_report.md",
        "docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md"
      ],
      "parentCommit": "b1245149e2b94248a39213737ea05adae4d53f5e",
      "parentTree": "f59b578a039e1fc615e6c8e3bbb83a826b833792",
      "targets": [
        {
          "after": {
            "blobOid": "634dc19caef779dca01d49f8af9f2a4b08797f6d",
            "bytes": 61272,
            "gitMode": "100644",
            "sha256": "dfa2028e5d63e7ec73329adceee52caaf4f742ab7c9c777ca238e837878089b6"
          },
          "before": {
            "blobOid": "49dd3a39ef4796cdf587b3d5394ef6add78172b1",
            "bytes": 60686,
            "gitMode": "100644",
            "sha256": "c791409aca283f546ab013f058c4ae98fa1b74e9574c1c6040e1ab516b624091"
          },
          "operation": "modify",
          "sourcePath": "docs/near-model-memory-plan-pack/completion_audit_report.md"
        },
        {
          "after": {
            "blobOid": "7aeb3ce1c9b9af2d3c71797590fba1ab28b31420",
            "bytes": 34457,
            "gitMode": "100644",
            "sha256": "66afc8f2c0eefe595ccd9ee1616968c7afe023c8da2cd7e4bac98d37b7c1422c"
          },
          "before": {
            "blobOid": "4cd86ef5efada6c3f927da923fe7d4dad73d26b4",
            "bytes": 34125,
            "gitMode": "100644",
            "sha256": "339bd48cba47ae02ac7dc60227bec8565880912d817b1da20161458fec71ccd0"
          },
          "operation": "modify",
          "sourcePath": "docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md"
        },
        {
          "after": {
            "blobOid": "21fdc9610602582fbcbef5c4c00b274695ca2782",
            "bytes": 9204,
            "gitMode": "100644",
            "sha256": "28a8bd8581efc2415bfe444d1eff472c1181d92e239c94e77d446659d09abb01"
          },
          "before": {
            "blobOid": "00426318115ca3b531b139437820b2150ee4d931",
            "bytes": 8810,
            "gitMode": "100644",
            "sha256": "52a8953f6030fc5d69fa2b3a8f4dbc9c547f94ce53d1fce488717a2f29e954df"
          },
          "operation": "modify",
          "sourcePath": "docs/near-model-memory-plan-pack/06_ACCEPTANCE_MATRIX.md"
        },
        {
          "after": {
            "blobOid": "f9131fde89684182e182f952bedf75b60adbcab5",
            "bytes": 19496,
            "gitMode": "100644",
            "sha256": "d487b391c7c0a95d98415714f4e6fb4773d0d66e0c3099a1286860573fd0a6c1"
          },
          "before": {
            "blobOid": "28d9962c13c6e80bf90bdb8b88f32eed3126d58a",
            "bytes": 19139,
            "gitMode": "100644",
            "sha256": "eea322dceed7e38dfaf3380fca194edd47fac2bb6ad4cc0564b076681a612e7d"
          },
          "operation": "modify",
          "sourcePath": "docs/near-model-memory-plan-pack/07_CAPABILITY_MATRIX.md"
        },
        {
          "after": {
            "blobOid": "def3705a3e36a44bdf42ecf2974c26ae937259ed",
            "bytes": 1808,
            "gitMode": "100644",
            "sha256": "d431ea83f848b949b9da1e8fa2b7e9f8cff804890da1b6dce35d522a7352d2c8"
          },
          "before": null,
          "operation": "add",
          "sourcePath": "docs/near-model-memory-plan-pack/cm2116_full_plan_application_state.json"
        }
      ],
      "tree": "fecb13c4f55d634197feab94d1dec5f56575521a"
    },
    "appliedState": {
      "fullPlanPackCompleted": true,
      "readiness": {
        "completeRealtimeMemory": false,
        "completeRealtimeMemoryClaimed": false,
        "completeV8": false,
        "completeV8Claimed": false,
        "cutoverReady": false,
        "cutoverReadyClaimed": false,
        "deployReady": false,
        "deployReadyClaimed": false,
        "fullBridgeCompletion": false,
        "fullBridgeCompletionClaimed": false,
        "fullPlanPackCompletedClaimed": false,
        "fullRealtimeMemory": false,
        "fullRealtimeMemoryClaimed": false,
        "modelMemoryComplete": false,
        "modelMemoryCompleteClaimed": false,
        "productionReady": false,
        "productionReadyClaimed": false,
        "rcReady": false,
        "rcReadyClaimed": false,
        "readinessClaimed": false,
        "releaseReady": false,
        "releaseReadyClaimed": false
      },
      "statusSyncPerformed": false
    },
    "contentDecision": {
      "blobOid": "8427d80c60cf49b96a0b84a24300cba41b5049b3",
      "canonicalPayloadSha256": "50ae5da8e81885abf2f45af87d41bef19ea0cb355999cd76449f52ed53c22a5a",
      "commit": "b1245149e2b94248a39213737ea05adae4d53f5e"
    },
    "executionPacket": {
      "blobOid": "568adf8e3b03f2334fa371e177d537699975adda",
      "canonicalPayloadSha256": "2e5299ee08dee5f3e07386f58508cf14921d047c2688a7f570273149f2c05454",
      "commit": "02a78ef88d28ea6b71c11f9c7bdceb83323d38a0"
    },
    "executionReceipt": {
      "canonicalPayloadSha256": "9e4761ace00edddfee62e2fd9663760bc2236110b807febc6a41a1b975f3ebef",
      "rawSha256": "c6bca575cc7fce687b2452ec75d25cb6271bfd66214addd2390d1813bbca83fe"
    },
    "finalRelease": {
      "blobOid": "dcd8b324a5eaaaf38f806d1b05289a85696a23ba",
      "canonicalPayloadSha256": "33caf9c61b76b77db505154f16d87f9507835379b55b60dbcae75f1b29abe579",
      "commit": "dd78a679bd2a2f86dd2865144465eda7cbbf6087"
    },
    "receiptType": "full_plan_application_commit_binding_receipt",
    "registry": {
      "authorizationConsumed": true,
      "authorizationReplayAllowed": false,
      "authorizationUseCount": 1,
      "bindingHash": "f0596fe77d1e1d9737bdbab8d2d1c5d20f9c9eae9fecb29597454520f5c8d635",
      "claimId": "c5838bac8e4f69c20d7231c8556d97a7ef83022612bc6ab191f805f89e1af411",
      "claimedAt": "2026-07-12T13:01:42.671Z",
      "finalReleaseApprovedAt": "2026-07-12T18:00:00+08:00",
      "finalReleaseExpiresAt": "2026-07-19T18:00:00+08:00",
      "finalStateRequired": "CONSUMED_SUCCESS",
      "patchInvocationCount": 1,
      "registryReference": "cm2116-full-plan-application-registry-001",
      "stateAtBindingReceipt": "EXECUTION_RECEIPT_WRITTEN"
    },
    "sideEffects": {
      "applicationCommits": 1,
      "nativeReads": 0,
      "nativeWrites": 0,
      "providerCalls": 0,
      "readinessClaims": 0,
      "realMemoryReads": 0,
      "remoteActions": 0,
      "repositoryPatches": 1
    }
  },
  "schemaVersion": 1,
  "taskId": "CM-2118"
}
```
