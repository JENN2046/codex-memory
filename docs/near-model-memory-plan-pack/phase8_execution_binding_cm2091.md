# CM-2091 Phase 8 Execution Binding Canonical Evidence

## Runtime and payload context

Canonical SHA-256: `fc9deec9505fbadb52d76573434495358a65319b676dfa14e695b57a6884ceac`

JSON bytes: `1383`; file SHA-256:
`fea164171fa0e48769374619fea6c307aee20260672fba3323730f42126e40d7`;
Git blob OID: `b26dd2890e7e1e0ddbef28af188ce49fd998fb42`.

```json
{"runtimeSourceCommit":"3ce0cc0fd842403de9aaf13d82c266a528d879d8","runtimeSourceTree":"0629b01a39d3ac66876b181829a0d623636f528c","payloadSourceCommit":"3ce0cc0fd842403de9aaf13d82c266a528d879d8","payloadGitObjectRef":"3ce0cc0fd842403de9aaf13d82c266a528d879d8:docs/near-model-memory-plan-pack/phase8_native_write_proof_record_cm2089.json","payloadBlobOid":"cde8e314a118e52e4beb9181401ee0bc7cc1dc68","payloadBytes":638,"payloadFileSha256":"3773ac46474890e033b6113d81fb2c0c191cbcbaf78225d2746eefb4c67fc245","payloadCanonicalSha256":"91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee","durableRecordBytes":269,"durableRecordSha256":"4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828","outerTransport":"isolated_stdio_mcp","innerNativeTransport":"local_http_transport","primaryRuntime":"VCPToolBox native memory","targetReferenceName":"cm2091-vcptoolbox-native-memory-target","targetKind":"mcp_server","sourceAuthority":"bridge_runtime_or_static_config","writeEnabledShimRequired":true,"scopeId":"cm2089-phase8-native-write-proof-001","projectId":"codex-memory","workspaceId":"codex-memory-phase8-proof","clientId":"Codex","visibility":"project","cleanDetachedCheckoutRequired":true,"runtimeHeadMustEqualSourceCommit":true,"staleLoadedRuntimeAllowed":false}
```

## Allowlist

Canonical SHA-256: `4a36b22c27c28e952ce1598da0f86025e1d561e624a404f1b91c7d3b8281cf0b`

JSON bytes: `767`; file SHA-256:
`650f2d84b26d408b7e4adcdf9f4a8bcf3578a320749a7c6393e8f2956f58a860`;
Git blob OID: `73426ab0fe60d6bdafde4bce8d620f115a146551`.

```json
{"nativeWriteTools":["record_memory"],"nativeWriteActions":["live_bridge_record_memory_proof"],"maxNativeWrites":1,"verifySurface":"verifyPhase8NativeWriteAuditProjection","verifyTool":"audit_memory","verifyAuditFamily":"governance","verifyWindow":1,"selectedFieldsOnly":true,"maxVerifyOperations":1,"rollbackOrCompensationActions":[],"maxRollbackOrCompensationOperations":0,"localFallbackWriteAllowed":false,"automaticRetryAllowed":false,"automaticRollbackAllowed":false,"existingMemoryModificationAllowed":false,"rawPrivateMemoryAccessAllowed":false,"defaultMcpExpansionAllowed":false,"remoteGitActionsAllowed":false,"releaseDeployCutoverAllowed":false,"readinessClaimAllowed":false}
```

## Exact durable Markdown bytes

The 638-byte authorization payload contains scope and governance metadata. The
shim persists exactly these 269 UTF-8 bytes, SHA-256
`4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828`:

```text
---
source: codex-memory-governed-native-mcp-shim
sensitivity: "none"
---

# CM-2089 Phase 8 governed native write proof

Synthetic governance proof record. No user memory. Non-production. Not RC_READY.

## Evidence

CM-2089 exact-authorized Phase 8 native write proof
```

Scope, tags, task ID, retention policy and validation flags are authorization /
transport metadata; they are not claimed as durable Markdown fields.
