# 08｜风险登记表

| ID | 风险 | 等级 | 影响 | 缓解 |
|---|---|---:|---|---|
| R1 | 把外部记忆误称模型内置记忆 | High | 目标误导、release 过度声明 | NON_CLAIMS 文档 |
| R2 | MCP 通道连通被误认为完整能力 | High | 过早开放权限 | 能力分层 |
| R3 | hardened explicit tools 绕过 read-only | High | 安全面破洞 | Phase 1 修复 |
| R4 | AtomicFileWriter stale lock TOCTOU | High | 数据一致性风险 | Phase 1 修复 |
| R5 | Codex 忘记主动查记忆 | High | 体验不像内置记忆 | `prepare_memory_context` |
| R6 | context package 注入错误记忆 | High | 错误决策 | Recall quality gate |
| R7 | private memory 跨 client 泄露 | High | 隐私/权限事故 | scope / visibility proof |
| R8 | fallback 被误认为 native | High | 虚假实时声明 | source marking |
| R9 | 写入污染 VCP native memory | High | 难恢复 | two-phase write |
| R10 | tombstone/supersede 破坏性误操作 | High | 记忆丢失 | operator-only + exact approval |
| R11 | README 过度声明 | Medium | 审查失败 | 文档 gate |
| R12 | Windows/WSL 环境差异 | Medium | proof 假阳性 | smoke test |
| R13 | 召回质量不稳定 | Medium | 体验差 | query suite |
| R14 | audit receipt 不足 | Medium | 无法复核 | receipt contract |
| R15 | rollback posture 不完整 | High | 写入后不可恢复 | rollback drill |
| R16 | native shim shape 不兼容 | High | 伪装 overview/audit | shape-compatible gate |
| R17 | local fallback 变成事实 owner | Medium | 架构偏离 | local memory role 文档 |
| R18 | full surface 被误设为默认 | High | 权限事故 | config hardening |
| R19 | provider/live proof 不可重复 | Medium | 生产不稳 | evidence + observation |
| R20 | 计划过大导致执行发散 | Medium | 项目停滞 | 分阶段窄任务 |
