# Single-Window 4-Agent Compact Autopilot

更新时间：2026-05-12

## 这是什么

`Single-Window 4-Agent Compact Autopilot` 是 `codex-memory` 当前维护期已经落仓的一种工作模式。

它不是新的 runtime，不是新的 MCP contract，也不是新的外部服务。

它是一套仓库内的持续推进轨道：在**单个主工作窗口**里，用一套明确的角色、文件锁、风险登记、验证账本和 handoff 规则，把多步本地工作稳定地推进下去。

## 为什么叫这个名字

这个名字强调三件事：

1. `Single-Window`
   - 主控制面保持在一个连续工作窗口里
   - 最终状态、验证和集成都回到同一个控制面收口

2. `4-Agent`
   - 指的是四类**逻辑角色**
   - 不要求任何时刻都真的开四个独立进程

3. `Compact Autopilot`
   - 目标是用最少的治理件，换来持续、可验证、可恢复的本地推进
   - 不把仓库变成重流程平台

## 四类逻辑角色

### 0. Supreme Commander

`Supreme Commander` 不是第五个 Worker。

它是 A4.8 下的最高本地控制角色：负责读仓库现实、选择下一条安全任务、写 task contract、分配 Worker/Verifier、收口验证、更新 `.agent_board`，并在 A5 hard stop 前生成 approval packet 而不是越权执行。

详细协议见 [SUPREME_COMMANDER_AUTOPILOT_PROTOCOL.md](/A:/codex-memory/docs/SUPREME_COMMANDER_AUTOPILOT_PROTOCOL.md)。

### 1. Commander

主控会话。

负责：

- 读取仓库现实
- 选择下一条安全任务
- 写 task contract
- 分配 allowed/disallowed files
- 决定 validation 范围
- 串行集成最终结果

### 2. Worker Alpha

第一个临时执行角色。

适合：

- 单文件或小范围实现
- 文档/测试补丁
- 范围明确的局部修复

### 3. Worker Beta

第二个临时执行角色。

适合：

- 与 Alpha 不重叠的并行小任务
- 只在 file locks 和 task contract 清楚时启用

说明：`Worker Alpha / Beta` 是最小并行模型，不要求仓库永远固定只用两个 Worker；这里只是当前推荐的 compact 形态。

### 4. Read-Only Verifier

只读复核角色。

负责：

- 检查 scope 有没有漂移
- 检查 hard stop 有没有被踩
- 检查 validation 证据是否匹配风险
- 检查 `.agent_board` 是否足够新鲜
- 给出 `PASS / NEEDS_FIX / BLOCKED`

Verifier 不改文件，不提交，不 push。

## 仓库里已经落下来的组成件

这套模式当前依赖这些仓库内文件：

- [AGENTS.md](/A:/codex-memory/AGENTS.md)
- [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md)
- [.agent_board/RUN_STATE.md](/A:/codex-memory/.agent_board/RUN_STATE.md)
- [.agent_board/CHECKPOINT.md](/A:/codex-memory/.agent_board/CHECKPOINT.md)
- [.agent_board/HANDOFF.md](/A:/codex-memory/.agent_board/HANDOFF.md)
- [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)
- [.agent_board/BLOCKERS.md](/A:/codex-memory/.agent_board/BLOCKERS.md)
- [.agent_board/DECISIONS.md](/A:/codex-memory/.agent_board/DECISIONS.md)
- [.agent_board/FILE_LOCKS.md](/A:/codex-memory/.agent_board/FILE_LOCKS.md)
- [.agent_board/RISK_REGISTER.md](/A:/codex-memory/.agent_board/RISK_REGISTER.md)

其中：

- `TASK_QUEUE` 管任务
- `RUN_STATE` 记录当前现实
- `CHECKPOINT` 记录阶段落点
- `HANDOFF` 负责跨会话恢复
- `VALIDATION_LOG` 是验证账本
- `FILE_LOCKS` 防并行撞文件
- `RISK_REGISTER` 记住当前批次风险

## 当前边界

这套模式当前已经支持：

- sustained local autopilot
- Commander -> Worker -> Verifier 闭环
- file lock / risk register
- guarded local commit
- 经用户授权后的 judged push

这套模式当前**不等于**：

- 自动 deployment
- 自动 release
- 自动 dependency change
- 自动外部服务写入
- 自动绕过 `.env` / secrets / production 边界

## 什么时候适合用

适合：

- 多步本地维护任务
- docs + tests + source 的小批次推进
- 需要可靠 handoff 的持续工作
- 需要并行但又不想失控的仓库维护

不适合：

- 需要大规模架构改写的批次
- 需要远端写入但未明确授权的任务
- 需要真实迁移、cleanup apply、profile confirm 的高风险操作

## 标准闭环

最小闭环是：

1. Commander 读仓库现实
2. Commander 写 task contract
3. Worker 在 allowed files 内执行
4. 跑对应 validation
5. Verifier 只读复核
6. Commander 更新 `.agent_board`
7. 满足条件时 guarded commit
8. 满足授权与判断时 push

## 新电脑能带走什么

只要仓库同步下来，这些能力会一起带走：

- 模式定义
- 任务轨道
- Verifier 协议
- file lock / risk register 规则
- handoff / validation ledger

也就是说，**仓库内工作方式可以迁移**。

## 新电脑还需要补什么

这套模式不是把整台机器也一起打包。

新电脑仍要补齐：

- Git
- Node.js / npm
- PowerShell
- Codex 本地运行环境
- 需要的话，Claude / MCP / 本地技能与插件环境

换句话说：

- 仓库内 autopilot 轨道是可迁移的
- 机器级运行环境不是仓库自动附带的

## 推荐首次恢复步骤

在新电脑上，建议按这个顺序恢复：

1. 拉取仓库
2. 查看 [README.md](/A:/codex-memory/README.md)
3. 查看 [AGENTS.md](/A:/codex-memory/AGENTS.md)
4. 查看 [.agent_board/RUN_STATE.md](/A:/codex-memory/.agent_board/RUN_STATE.md)
5. 查看 [.agent_board/HANDOFF.md](/A:/codex-memory/.agent_board/HANDOFF.md)
6. 运行：

```powershell
git status -sb
npm test
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## 一句话定义

`Single-Window 4-Agent Compact Autopilot` 是 `codex-memory` 当前已经落仓的轻量持续推进模式：单窗口主控、最多两名临时 Worker、一个只读 Verifier、再加 `.agent_board` 轨道，把本地多步维护任务推进到可验证、可恢复、可迁移的状态。
