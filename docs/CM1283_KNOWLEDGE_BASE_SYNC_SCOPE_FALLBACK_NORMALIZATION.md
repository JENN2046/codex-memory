# CM-1283 Knowledge-Base Sync Scope Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for knowledge-base sync scope preservation and governance revision entry construction.

This change does not call providers, call MCP external tools, scan real memory, write durable memory or audit outside test fixtures, change config/watchdog/startup, expand public MCP tools, push, deploy, or claim readiness/reliability.

## Change

`src/recall/KnowledgeBaseSyncService.js` now uses the first non-empty normalized governance field when merging diary records with existing shadow records.

Covered fields:

- `projectId`
- `workspaceId`
- `clientId`
- `taskId`
- `conversationId`
- `visibility`
- `retentionPolicy`

The same fallback rule is used for default governance revision entries, so blank diary scope fields no longer erase existing shadow scope from sync writeback or candidate-cache governance revision metadata.

## Validation

- `node --check src\recall\KnowledgeBaseSyncService.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js tests\phase-b-sync-cache-rerank.test.js tests\policy-read-preflight.test.js` passed `53/53`.
- `npm test` passed `2803/2803`.

## Remaining Boundary

This is local source/test evidence only. It is not fresh live client evidence, recall reliability, runtime readiness, cutover readiness, or RC readiness.
