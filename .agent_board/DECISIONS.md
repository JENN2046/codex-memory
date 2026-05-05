# DECISIONS.md — codex-memory

| ID | Context | Decision | Reason | Alternatives | Evidence / Validation | Date |
|---|---|---|---|---|---|---|
| CMD-0001 | Autopilot setup | Use A4-Sustained Local Autopilot with codex-memory-specific gates | Repository is mature and needs sustained local work without bypassing gates | Generic AGENTS only | README current reality + AGENTS.md | 2026-05-05 |
| CMD-0002 | Runtime default | Treat HTTP MCP 7605 as default mainline assumption, but verify before relying | README recommends HTTP MCP for Codex Desktop stability | stdio default | observe:http / health when needed | 2026-05-05 |
| CMD-0003 | Rollback | Treat rollback planning as read-only; config changes require approval | Prevent accidental mainline switch | auto apply patch | rollback:mainline:plan only | 2026-05-05 |
| CMD-0004 | Remote boundary | Push remains explicit-approval only | Autopilot increases local momentum but must not create remote side effects silently | auto-push | user approval before each push | 2026-05-05 |
