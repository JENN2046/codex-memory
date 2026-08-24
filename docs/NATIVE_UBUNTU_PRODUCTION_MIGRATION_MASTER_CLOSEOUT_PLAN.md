# Native Ubuntu Production Migration Master Closeout Plan

```yaml
document_type: native_ubuntu_production_migration_master_closeout_plan
schema_version: native_ubuntu_production_migration_master_closeout_plan.v1
project: codex-memory
repository_identity: JENN2046/codex-memory
authority_scope: native_ubuntu_production_migration_only
project_master_taskbook_replaced: false
```

## 1. 文档权威与当前冻结状态

本文档只管理 Native Ubuntu production migration，不替代
`PROJECT_MASTER_TASKBOOK.md`。它必须先通过独立 docs-only branch、review、PR 和
merge 被采用；后续 Gate 引用 adoption merge 后实际读取的 `origin/main`。

Controller source authority 与 Runtime generation provenance 是两个不同的权威面：

```yaml
deployment_controller_canonical:
  pre_plan_adoption_commit: 9bf0454ca0e2b1e1d03366f2a4b301695011925a
  pre_plan_adoption_tree: 4673b4648cb7745b2fc3f13982669c970d401e32
  transition_primitive_sha256: 5fb1a8b0fbc4bdadacdc3f85e65709eba41339355d4e9e26005486656596eded

runtime_generation_provenance:
  commit: b7e6cdba40be92c2d3eb978d2a16b75bb9e89ae3
  tree: 4ea198ca3d00e4ca25c545a97c06e1780e507c66
```

Controller 可以因 docs、`host-bootstrap` 或 systemd repair 前进。已冻结的 Runtime
generation 继续绑定 `b7e6cdba...`；除非 Runtime build-context 文件发生变化，否则不得
重建 Runtime 或改写其 provenance。

当前 artifact ledger：

```yaml
runtime_image:
  build_manifest: sha256:9e1e5fe9c23af34e15a17221a1c72cbe9a76037e79b1bbe84d9bfafaabe15d9c
  oci_archive: sha256:75ba33366db3887eec14830d1fbe38f13b90b98c3fadeca1b13c40b86e33a2f0
  image_config: sha256:bb433da2330e716fc81e6affe39a37b799392ce5c295d98d2509699936b6c4ff
  image_identity: sha256:25245b29be3aef3ec2188525cb87e635572255ce52ce2b05c4d919239ccaadf3
  rootfs_chain: sha256:3e6379841fc2e3a8fda932ff3627c5b8dc9fe461c6a04cdea57bb67c22fb7bff
  native_closure: sha256:ba2f9ae2dbc1cf67b4e582e3a8fa39f48d13966e51f9f632a5e71ea60bb0d2fc

old_generation:
  authority: sha256:002b1103ef4074aae1c7d8a7a7680430d3ee1f4ce627738de6f48a4f7f9127dc
  profile: sha256:e4be9c41c914b8169208cf3b3eefdba17707e77d7247e6414c5f35471b8cbb0c
  bundle: sha256:f29f30055893cfeae8dce6337b4b5b3e499aee88bdc8b071a633cfea8ad7be78
  runtime_id: 400092378fc77d561f0b67c71e65570eebd99a8d004e8f9e4f441accb105f69f
  runtime_running: false

new_generation:
  authority: sha256:f1e0e397327dce602a3fac92cec8146957451b6978db531fb0cc865aa1387cca
  profile: sha256:0389c271dc400f71240ac3bc776dc22ff455f85c2e836df031aab72bf3aa6aec
  bundle: sha256:b16b44bb0438ae72f1682f2468b813656f782b760c75649c1f98a060531be10b
  runtime_id: 5025a06968242e7909ae6308bcdebb10d927ad00cd8b5d52f7cd2c9e9fecf97a
  runtime_state: created
  runtime_running: false

historical_transition:
  transaction_id: e21c621432a9f546b2a80be6
  state: ROLLED_BACK
  journal_sha256: sha256:4e3472963b7ec92365275044be583cf0bd0a92738a67aac8470ac973c1775c52
  immutable: true
```

## 2. 全局执行规则

- Repository identity 必须精确为 `JENN2046/codex-memory`；每个 Gate 从 clean detached
  canonical worktree 开始。
- 每个 production mutation Gate 都需要独立、当前有效的显式授权；PASS 不自动授权下一 Gate。
- 每次 mutation 前后记录 authority、profile、bundle、Runtime、Edge、Provider、journal 和
  source identities。
- 禁止自动 reset、clean、pull、Runtime recreate、authority/profile/bundle regeneration、
  systemd mutation 或 host reboot。
- 历史 `ROLLED_BACK` journal、OLD Runtime 和旧 generation artifacts 在最终 closeout 前不得删除。
- Source repair 只能通过独立 branch、tests、fresh review、PR 和 merge；禁止直接修改 canonical
  worktree。
- Source-changing Gate 要求 baseline/candidate exact regression comparison，新增失败为零，fresh
  review `P0=0/P1=0`。
- 不读取 secrets、credentials 或 broad raw memory；memory proof 只允许 bounded、low-disclosure
  输出。
- 任一 identity、commit、tree、digest、container ID 或 expected lifecycle drift 都立即 STOP。
- 每个 receipt 必须包含 Gate、predecessor、canonical commit/tree、artifact ledger、pre/post
  state、实际 mutation、tests、review、blockers 和 result code。

本计划不新增 public MCP API、schema 或 tool。Real Memory Gate 只使用现有正式工具。唯一已知
的后续 production interface change 是将 systemd `ExecStart` 固定到 admitted Node 22。

## 3. 顺序 Gate

### Gate 0 — Master Plan Adoption

```text
NATIVE_UBUNTU_PRODUCTION_MIGRATION_MASTER_CLOSEOUT_PLAN_ADOPTION
```

只新增本文档。执行 `git diff --check`、文档校验和 scope review，创建并合并 docs-only PR。
合并后读取实际 `origin/main` commit/tree，并证明 transition primitive SHA256 仍为
`5fb1a8b0fbc4bdadacdc3f85e65709eba41339355d4e9e26005486656596eded`，Runtime image context
和 Host Trust Bundle 均未改变。

结果：

```text
PASS_NATIVE_UBUNTU_PRODUCTION_MIGRATION_MASTER_CLOSEOUT_PLAN_ADOPTION
```

### Gate 1 — Exact Edge Lifecycle Recovery and Candidate Readmission

```text
POST_PR111_EDGE_LIFECYCLE_RECOVERY_AND_CANDIDATE_READMISSION
```

当前 blocker：

```yaml
edge:
  id: 2358a61410113686e17022071c1b974ab23a29957b0c11afa42c1e5b39a72a48
  state: exited
  exit_code: 0
```

先只读诊断停止原因、Docker config、restart policy、logs、mounts、network 和 authority
binding。只有获得独立 production lifecycle 授权后，才允许启动这个 exact existing container。

必须满足：

- 不 recreate、不 rename、不替换 Edge。
- 启动后 exact ID 不变、`running=true`、`healthy=true`。
- Provider exact ID 仍 running。
- OLD/NEW Runtime 均保持 stopped。
- authority/profile/bundle/journal 不变。

若 exact Edge 无法恢复，输出：

```text
STOP_EDGE_EXACT_ID_RECOVERY_FAILED
```

不得自行创建 replacement Edge 或改写 authority。

Edge 恢复后，从 post-adoption canonical primitive 以 root 执行 exact `--execute=false`
candidate verification。要求：

```yaml
accepted: true
action: generation_transition_candidate
mutation: false
plannedTransition:
  newRuntimeContainerId: 5025a06968242e7909ae6308bcdebb10d927ad00cd8b5d52f7cd2c9e9fecf97a
```

完成后重新证明 production journal 和 OLD generation 零 mutation。

结果：

```text
PASS_POST_PR111_EDGE_LIFECYCLE_RECOVERY_AND_CANDIDATE_READMISSION
```

### Gate 2 — Coherent Generation Transition and First Successful Admission

```text
POST_COHERENT_GENERATION_TRANSITION_AND_LIVE_ADMISSION
```

需要新的独立 live-transition 授权。准入条件是 Gate 1 刚完成且其后无 drift。

顺序固定为：

```text
fresh preflight
→ candidate-only replay
→ execute canonical transition primitive
→ NEW bundle + NEW authority COMMITTED
→ installed launcher verify
→ fresh Edge/Provider receipts
→ start existing NEW Runtime
→ first successful admission
```

新 transaction ID 必须与 `e21c621432a9f546b2a80be6` 不同；历史 journal 保持
`ROLLED_BACK`。成功状态：

```yaml
active_bundle: sha256:b16b44bb0438ae72f1682f2468b813656f782b760c75649c1f98a060531be10b
active_authority: sha256:f1e0e397327dce602a3fac92cec8146957451b6978db531fb0cc865aa1387cca
active_profile: sha256:0389c271dc400f71240ac3bc776dc22ff455f85c2e836df031aab72bf3aa6aec
new_runtime_running: true
old_runtime_running: false
fresh_receipts: true
installed_launcher_verify: PASS
real_memory_mutation: false
```

失败规则：

- Commit 前失败由 primitive 恢复 coherent pair。
- 一旦 journal 已 `COMMITTED`，后续 receipt/start failure 作为 post-transition admission
  failure 处理；不得把历史 journal 或已提交 generation 自动改回。
- 不得拆成手工 copy、authority write 或 launcher bypass。

结果：

```text
PASS_POST_COHERENT_GENERATION_TRANSITION_AND_LIVE_ADMISSION
```

### Gate 3 — Real Memory Read / Write / Recall

```text
POST_LIVE_ADMISSION_REAL_MEMORY_READ_WRITE_RECALL
```

需要独立 durable-memory-write 授权。使用现有 MCP/Runtime/Edge/Provider/VCP 正式链路：

```text
bounded existing-memory read
→ freeze one unique synthetic marker
→ one controlled durable write
→ immediate exact recall
→ prove persistent backend retrieval
```

禁止 broad scan、批量写、fixture-only 证明或只凭 HTTP 200 判定成功。保留 marker 供 restart
和 cold-reboot Gate 使用；receipt 只记录 marker digest、scope 和 retrieval proof，不扩散 raw
memory。

结果：

```text
PASS_POST_LIVE_ADMISSION_REAL_MEMORY_READ_WRITE_RECALL
```

### Gate 4 — Runtime Restart Persistence

```text
POST_REAL_MEMORY_RUNTIME_RESTART_PERSISTENCE
```

需要独立 restart 授权。通过 canonical installed launcher/lifecycle lock 重启 existing NEW
Runtime，不 recreate container。

必须验证：

- Runtime container ID、image、authority、profile、bundle 和 mounts 不变。
- Edge/Provider exact identities 不变。
- Fresh continuity receipts 绑定当前 boot 和当前 generation。
- Gate 3 marker 在 restart 后仍可准确 recall。
- OLD Runtime 未复活。

结果：

```text
PASS_POST_REAL_MEMORY_RUNTIME_RESTART_PERSISTENCE
```

### Gate 5 — Systemd Node22 Source Repair and Activation

```text
SYSTEMD_NATIVE_RUNTIME_NODE22_ENTRY_REPAIR_AND_ACTIVATION
```

当前事实：

- `runUnderLifecycleLock` argv defect 已关闭。
- 仓库 unit `deploy/systemd/codex-memory-native-runtime.service` 仍使用 `/usr/bin/node`。
- `/usr/bin/node` 为 Node 18。
- 主机当前未安装该 production unit。

先执行 source-repair Gate：

- 将 `ExecStart` 的 Node 固定为 `/opt/nodejs/node-v22.23.1/bin/node`。
- 保留 lifecycle lock FD、root identity、stdout/stderr 和 fail-closed semantics。
- 只修改 unit 与对应测试。
- 执行 targeted、full regression、fresh review、PR、merge 和 canonical freeze。
- 该文件不在 Runtime image context 和 Host Trust Bundle 中，不重建 Runtime generation。

再取得独立 systemd activation 授权：

```text
install exact merged unit as root:root 0644
→ systemctl daemon-reload
→ enable unit
→ controlled handoff from direct launcher to systemd
→ systemd start existing NEW Runtime
```

要求 systemd 实际进程使用 admitted Node22、同一 Runtime ID、同一 authority/profile/bundle，
并通过 marker recall。若失败，停止 unit；任何恢复 direct-launcher 或移除 unit 的动作都必须按
预先冻结的 rollback packet 执行。

结果：

```text
PASS_SYSTEMD_NATIVE_RUNTIME_NODE22_ENTRY_REPAIR_AND_ACTIVATION
```

### Gate 6 — Host Cold Reboot Acceptance

```text
HOST_COLD_REBOOT_NATIVE_RUNTIME_ACCEPTANCE
```

这是独立高风险 Gate，需要明确 host reboot 授权和 reboot 前后可恢复的 evidence handoff。

Reboot 前冻结全部 identities、marker、unit hash、enabled state 和观察命令。执行整机 reboot 后，
在任何人工修复前观察：

```text
Linux boot
→ systemd
→ admitted Node22
→ host launcher
→ authority/profile verification
→ exact Runtime recovery
→ exact Edge/Provider recovery
→ MCP reconnect
→ marker recall
```

PASS 必须证明：

- 无手工补环境变量、无 bootstrap、无 recreate。
- generation、container IDs、authority、profile、bundle 和 mounts 无 drift。
- OLD failed Runtime 未复活。
- Memory marker 仍可 recall。
- Secrets 未泄漏。
- 如果需要人工干预才能恢复，本 Gate 失败，不得称为 cold-boot-safe。

结果：

```text
PASS_HOST_COLD_REBOOT_NATIVE_RUNTIME_ACCEPTANCE
```

### Gate 7 — Final Migration Closeout

```text
NATIVE_UBUNTU_PRODUCTION_MIGRATION_FINAL_CLOSEOUT
```

创建独立 docs-only closeout receipt，冻结最终 actual canonical commit/tree 和完整 evidence chain：

```yaml
source: PASS
runtime_generation: PASS
live_admission: PASS
real_memory_read: PASS
real_memory_write: PASS
real_memory_recall: PASS
restart_persistence: PASS
systemd_node22: PASS
cold_reboot_auto_recovery: PASS
identity_drift: false
authority_drift: false
provenance_drift: false
secret_leak: false
open_P0: 0
open_P1: 0
```

只有全部 Gate PASS 后，才允许：

```text
PASS_NATIVE_UBUNTU_PRODUCTION_MIGRATION_FINAL_CLOSEOUT
Native Ubuntu production migration COMPLETE
```

旧 Runtime、历史 journals 和 rollback artifacts 的删除不属于本计划；如需清理，必须进入独立
post-closeout retention/cleanup Gate。

## 4. 验证矩阵与停止条件

| Gate | 必须证明 | 主要 STOP |
| --- | --- | --- |
| Plan adoption | docs-only、primitive/runtime boundary unchanged | canonical/source drift |
| Edge recovery | exact Edge running+healthy，零 generation mutation | exact Edge 不可恢复 |
| Candidate readmission | accepted、mutation=false | lifecycle/identity/input drift |
| Live transition | NEW+NEW committed、fresh receipts、first successful admission | rollback 或 post-commit admission failure |
| Real memory | real write→persistent storage→real recall | fixture-only 或 recall mismatch |
| Restart | same generation + marker survives | identity/state/memory drift |
| Systemd | admitted Node22 + exact Runtime handoff | Node18、unit drift、start failure |
| Cold reboot | zero-touch auto recovery | manual intervention 或任何 identity drift |
| Closeout | evidence 完整且 P0/P1=0 | 任一 predecessor 未 PASS |

## 5. 已采用的默认决定

- 本计划是独立 migration authority，保存在仓库 `docs/`。
- 必须先单独合并本计划，再继续 Edge recovery。
- Edge recovery 是独立 production Gate，不并入 live transition。
- Exact Edge 无法恢复时 fail closed；不自动 recreate 或 regenerate authority。
- Runtime image、NEW Runtime、authority、profile 和 Host Trust Bundle 默认继续复用，不重新生成。
- Systemd 阶段同时覆盖 source repair、unit 安装、enable 和受控 activation。
- 每个 production mutation 与 host reboot 都需要单独授权，任何 PASS 都不自动进入下一 Gate。
