# codex-memory 外部审查重新申请书

申请日期：2026-07-11

申请范围：`docs/near-model-memory-plan-pack/`

申请事项：仅重新审查 `externalReviewPassed`

## 一、申请结论

现申请独立外部审查者复核 CM-2079 的 clean/frozen、runtime-matched
机器证据，并对下列决定作出独立结论：

```yaml
externalReviewPassed: <true|false>
externalReviewEvidenceBundleAppliedToCompletionAudit: false
tagApprovalPacketPassed: false
phase8NativeWriteAuthorizationGranted: false
```

本申请不要求、也不授权后三项变更。

## 二、冻结审查基线

```text
sourceCommit=1822d7e8492424cd4b8849d544df087cf9c8edad
sourceTree=bac696fac692509572ecd1ab889a5b3aedc4b9a6
worktreeCleanAtReplayStart=true
loadedRuntimeHead=1822d7e8492424cd4b8849d544df087cf9c8edad
runtimeHeadMatchesSourceCommit=true
canonicalPayloadSha256=2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2
```

## 三、已修正事项

1. Phase 2 不再依赖调用方布尔断言。三项 native read 均由一次性运行时
   实际执行，并生成 per-call safe reference、完整低披露 projection hash、
   audit receipt 分类和副作用计数。
2. Phase 2 source commit、loaded runtime HEAD 与 clean checkout 已一致。
3. Windows/WSL 的 `cmd.exe` 与 `powershell.exe` smoke 均为机器执行、exit
   zero，且未保存命令输出、路径或环境变量值。
4. Phase 9 使用实际 stdio `initialize + tools/list`，不是测试常量；结果仅
   包含五个默认 read/context/proposal 工具。
5. `test:all` 和 `gate:ci -- --json` 由生成器执行并从退出码、计数与摘要
   自动判定；只保留低披露记录引用和输出摘要哈希，不保存原始输出。
6. canonical Markdown 可通过只读审查面读取，且递归排序 payload 的
   SHA-256 可独立复算。
7. Completion Audit 应用顺序已消除循环：先要求外审通过并在
   `tagApprovalPacketPassed=false` 时应用 Completion Audit；Tag Approval
   Packet 后置独立审查。

## 四、精确证据哈希

```text
phase2_machine_execution_evidence_manifest.json
9697fec7e60ac3a51f9339e1dd4694075f818940007cbc653c89f5ca01ce0e03

windows_wsl_machine_smoke_receipt.json
60b38d4025d567aa8ac7b839b00aa3539884d67450647157cbe22b9c2363718d

phase9_machine_observation_artifact.json
138ad75ed7d41d88c689544cac217ddfa6ef751f2fe586c997fa37163f18968d

external_review_conflict_resolution_report.md
0e6c6f285c0f8f6caec80c46588ce78ae51829d5bdaa2498882b0fae42a96014
```

## 五、必须保留的非声明边界

- VCPToolBox native memory 继续是最终 memory intelligence owner。
- 本次 Phase 2 replay 使用 fixture embedding provider 与 isolated derived
  store；它证明治理链和 native execution，不是 production-provider proof。
- 三次 isolated derived-index write 不是 primary/native memory write，也不是
  Phase 8 proof。
- 默认 MCP 继续严格为 `search_memory`、`memory_overview`、`audit_memory`、
  `prepare_memory_context`、`propose_memory_delta`。
- `commit_memory_delta` 继续非公开、operator-only。
- 本申请不批准 Completion Audit 应用、Tag Approval Packet、Phase 8 native
  write、真实 tag、push、release、deploy、cutover、production、RC_READY、
  complete V8 或完整计划包完成声明。

## 六、请求的审查输出

请仅对 `externalReviewPassed` 给出 `true` 或 `false`，绑定上述 source
commit、canonical payload hash 与四个精确证据哈希；任一对象变化都应重新
审查，不得沿用决定。
