# CM-1276 Execution Context Scope Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1276 fixes a narrow execution-context scope normalization edge case.

Before this change, blank camel-case fields such as `clientId: "   "` could mask valid snake-case fallback fields such as `client_id: "claude"`. That could weaken Codex/Claude scope attribution when mixed client metadata forms are present.

## Changed Behavior

`ExecutionContextResolver` now uses the first non-empty normalized value for paired camel-case and snake-case scope fields:

- `userId` / `user_id`
- `projectId` / `project_id`
- `workspaceId` / `workspace_id`
- `clientId` / `client_id`
- `taskId` / `task_id`
- `conversationId` / `conversation_id`
- `retentionPolicy` / `retention_policy`

The change preserves existing precedence when the camel-case field is non-empty, while allowing valid snake-case fallback when camel-case is blank.

## Validation

- `node --check src\core\ExecutionContextResolver.js`
- `node --check tests\phase-a-services.test.js`
- `node --test tests\phase-a-services.test.js tests\memory-write-preflight-runtime-integration.test.js tests\policy-read-preflight.test.js` passed `28/28`.
- `npm test` passed `2796/2796`.

## Boundaries

- No public MCP tool expansion.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory or audit write outside test fixtures.
- No config, watchdog, or startup change.
- No remote action.
- No readiness or reliability claim.
