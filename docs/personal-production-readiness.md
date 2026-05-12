# Personal Production Readiness Checklist

更新时间：2026-05-09
适用版本：`v0.1.1-scope-boundary-20260508`

## 1. 固定 Tag

```text
v0.1.1-scope-boundary-20260508
```

当前生产基线。不要轻易移动此 tag。

## 2. 必须备份

在每次重大变更前，必须备份以下内容：

```text
data/
logs/
dailynote/
config.env
```

备份命令示例：

```powershell
Copy-Item -Recurse A:\codex-memory\data A:\backups\codex-memory\data-$(Get-Date -Format 'yyyyMMdd-HHmmss')
```

## 3. 必须验证

每次变更后必须运行：

```powershell
npm test
npm run gate:mainline:strict
npm run dashboard
npm run scope:acceptance -- --json
```

如果 `scope:acceptance` 尚未完成，至少运行：

```powershell
npm test
npm run gate:mainline:strict
```

## 4. 运行边界

```text
仅 127.0.0.1
不公网暴露
不多租户
不处理高敏 secrets
```

- HTTP MCP 默认监听 `127.0.0.1:7605`
- 不对外暴露端口
- 不在环境变量中存储真实 API key（使用用户 profile 或系统 secret 注入）
- 不注册公网域名

## 5. 观察指标

日常使用中应关注：

| 指标 | 检查方式 | 正常值 |
|------|---------|--------|
| write audit | `npm run observe:http -- --json` | accepted/rejected 分布正常 |
| recall audit | `npm run observe:http -- --json` | recallType 分布合理 |
| dashboard warn/error | `npm run dashboard` | 无 error |
| scope leakage | `npm run scope:acceptance -- --json` | status=ok |
| DB growth | 检查 `data/codex-memory.sqlite` 大小 | 线性增长，无异常暴增 |
| gate:mainline | `npm run gate:mainline:strict` | 全部 green |

## 6. 7 天观察计划

连续 7 天，每天至少运行一次：

```powershell
npm run dashboard
npm run gate:mainline:strict
npm run scope:acceptance -- --json
```

记录每天的：
- 写入数量
- 召回数量
- 错误数量
- scope leakage 是否为零
- DB 大小

## 7. 出现 warn/error 时的处理顺序

1. 先跑 `npm run observe:http -- --json` 查看运行态
2. 如果 HTTP 服务不可用，执行 `npm run start:http:ensure`
3. 如果 watchog 恢复次数过多，检查 `logs/codex-memory-http-watchdog.log`
4. 如果 compare/rollback 不匹配，先跑 `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json`
5. 确认根因后再决定是否回滚
