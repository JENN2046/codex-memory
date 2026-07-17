# ChatGPT Web R3 M3-T3 — 本地输出信任与注入信号

状态：仅完成本地纯函数与对抗性合成测试；未读取真实记忆、未启动 UDS/HTTP、未调用 Tunnel、ChatGPT、provider、其他 App 或网络。

M3-T3 新增两个低披露 receipt：

- `ChatGptWebOutputSafetyReceipt`：只接受合成的 candidate statement，强制 6 项、每项 420 字符、总计 12 KB 的 C6 预算；拒绝原始 ID、路径、endpoint、token、secret、provider payload 与未知字段。
- `ChatGptWebInjectionSignalReceipt`：识别“忽略系统指令”、隐藏工具、secret 外泄、Gmail/网页/跨 App 外传等对抗性文本，但只返回分类计数和摘要，不返回原文。

两种 receipt 都固定声明 `contentTrust=untrusted_memory_data`、`advisoryOnly=true`、工具/网络/provider/记忆写入计数为零；检测是 telemetry，不会执行文本指令。当前仅接受 `synthetic_fixture`，不会生成或伪造 `chatgpt_data_boundary_receipt_v1`，也不形成 Data Controls、真实记忆读取、canary、E2E、发布或就绪证明。

验证：

```text
node --test tests/chatgpt-web-output-injection-receipt.test.js
```

M3-T4、M4、真实 Data Controls/ChatGPT Memory 设置、真实三层 health、UDS 服务、Tunnel、ChatGPT、provider 和真实 memory/audit 仍不在此阶段范围内。
