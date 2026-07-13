'use strict';

const crypto = require('node:crypto');

const WORKFLOW_SCHEMA_VERSION = 'task_start_memory_context_workflow_v1';

const FORBIDDEN_CONTEXT_KEYS = Object.freeze([
  'rawMemory',
  'raw_memory',
  'rawAudit',
  'raw_audit',
  'rawOutput',
  'raw_output',
  'providerPayload',
  'provider_payload',
  'endpoint',
  'token',
  'authorization',
  'memoryId',
  'memory_id',
  'filePath',
  'path'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeString(value, maxLength = 1000) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16);
}

function collectForbiddenKeys(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenKeys(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];
  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (FORBIDDEN_CONTEXT_KEYS.includes(key)) found.push(path);
    found.push(...collectForbiddenKeys(nested, path));
  }
  return found;
}

function deriveTaskFields(input = {}, requestContext = {}) {
  const sourceTask = isPlainObject(input.task) ? input.task : {};
  const executionContext = isPlainObject(requestContext.executionContext)
    ? requestContext.executionContext
    : {};
  const scope = isPlainObject(requestContext.scope) ? requestContext.scope : {};

  return {
    title: safeString(sourceTask.title || input.title || executionContext.taskTitle || 'task-start memory context', 300),
    user_request: safeString(sourceTask.user_request || input.user_request || executionContext.userRequest || '', 4000),
    project_id: safeString(sourceTask.project_id || scope.project_id || executionContext.projectId || '', 200),
    scope_id: safeString(sourceTask.scope_id || scope.scope_id || executionContext.scopeId || '', 200),
    workspace_id: safeString(sourceTask.workspace_id || scope.workspace_id || executionContext.workspaceId || '', 200),
    client_id: safeString(sourceTask.client_id || requestContext.clientId || executionContext.clientId || 'codex', 200),
    visibility: safeString(sourceTask.visibility || scope.visibility || executionContext.visibility || 'project', 200),
    repo: safeString(sourceTask.repo || input.repo || executionContext.repo || '', 300),
    current_branch: safeString(sourceTask.current_branch || input.current_branch || executionContext.currentBranch || '', 200),
    current_files: Array.isArray(sourceTask.current_files)
      ? sourceTask.current_files.map(file => safeString(file, 300)).filter(Boolean).slice(0, 30)
      : [],
    strict_scope: sourceTask.strict_scope !== false
  };
}

function extractStatements(pkg = {}, bucketName) {
  const bucket = Array.isArray(pkg[bucketName]) ? pkg[bucketName] : [];
  return bucket
    .map(item => safeString(item.statement, 220))
    .filter(Boolean)
    .slice(0, 3);
}

function buildInjectableSummary(memoryContextPackage = {}) {
  const sections = [
    ['must_know', 'Must know'],
    ['recent_decisions', 'Recent decisions'],
    ['current_state', 'Current state'],
    ['blockers', 'Blockers'],
    ['risks', 'Risks'],
    ['forbidden_assumptions', 'Forbidden assumptions']
  ];
  const lines = ['Memory context package:'];
  for (const [bucket, label] of sections) {
    const statements = extractStatements(memoryContextPackage, bucket);
    if (statements.length === 0) continue;
    lines.push(`${label}:`);
    for (const statement of statements) lines.push(`- ${statement}`);
  }
  const nextStep = safeString(memoryContextPackage.recommended_next_step, 260);
  if (nextStep) lines.push(`Recommended next step: ${nextStep}`);
  return lines.join('\n');
}

function unavailable(reasonCode, task, details = {}) {
  return {
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    status: 'memory_unavailable',
    memoryAvailable: false,
    contextInjected: false,
    taskStartAllowed: true,
    task,
    reasonCode,
    safeToProceedWithoutMemory: true,
    mustNotPretendToRemember: true,
    prepareMemoryContextCalled: details.prepareMemoryContextCalled === true,
    access: {
      readOnly: true,
      durableMutationPerformed: false,
      productionWritePerformed: false,
      mcpMemoryWriteCalled: false,
      providerApiCalled: false,
      readinessClaimed: false
    },
    receipt: {
      workflow_receipt_id: `tsmc_unavailable_${stableHash(`${reasonCode}:${JSON.stringify(task)}`)}`,
      low_disclosure: true,
      raw_error_returned: false,
      raw_memory_returned: false,
      raw_audit_returned: false
    }
  };
}

class TaskStartMemoryContextWorkflow {
  constructor({ prepareMemoryContext } = {}) {
    this.prepareMemoryContext = prepareMemoryContext;
  }

  async run(input = {}, requestContext = {}) {
    const task = deriveTaskFields(input, requestContext);
    if (typeof this.prepareMemoryContext !== 'function') {
      return unavailable('prepare_memory_context_not_configured', task);
    }

    let prepared;
    try {
      prepared = await this.prepareMemoryContext({
        task,
        options: isPlainObject(input.options) ? input.options : {}
      }, {
        ...requestContext,
        taskStartMemoryContextWorkflow: true,
        noTokenReadOnly: true
      });
    } catch (_error) {
      return unavailable('prepare_memory_context_failed', task, {
        prepareMemoryContextCalled: true
      });
    }

    const forbiddenKeys = collectForbiddenKeys(prepared);
    const access = isPlainObject(prepared?.access) ? prepared.access : {};
    if (
      forbiddenKeys.length > 0 ||
      prepared?.accepted !== true ||
      access.readOnly !== true ||
      access.durableMutationPerformed !== false ||
      access.productionWritePerformed !== false ||
      access.readinessClaimed !== false ||
      access.resultCanBeMistakenForVcpNative === true ||
      access.rawMemoryReturned === true ||
      access.rawAuditReturned === true ||
      access.providerPayloadReturned === true ||
      !isPlainObject(prepared.memory_context_package)
    ) {
      return unavailable('prepare_memory_context_unsafe_or_unusable', task, {
        prepareMemoryContextCalled: true
      });
    }

    const injectedContext = buildInjectableSummary(prepared.memory_context_package);
    return {
      schemaVersion: WORKFLOW_SCHEMA_VERSION,
      status: 'context_ready',
      memoryAvailable: true,
      contextInjected: true,
      taskStartAllowed: true,
      task,
      prepareMemoryContextCalled: true,
      injectedContext,
      injectedContextHash: stableHash(injectedContext),
      memory_context_package: prepared.memory_context_package,
      access: {
        readOnly: true,
        durableMutationPerformed: false,
        productionWritePerformed: false,
        mcpMemoryWriteCalled: false,
        providerApiCalled: false,
        readinessClaimed: false,
        localMemoryFallbackUsed: access.localMemoryFallbackUsed === true,
        resultCanBeMistakenForVcpNative: false
      },
      receipt: {
        workflow_receipt_id: `tsmc_${stableHash(JSON.stringify({
          task,
          packageReceipt: prepared.memory_context_package.audit_receipt?.receipt_id || ''
        }))}`,
        low_disclosure: true,
        raw_memory_returned: false,
        raw_audit_returned: false,
        durable_mutation_performed: false,
        production_write_performed: false
      }
    };
  }
}

module.exports = {
  FORBIDDEN_CONTEXT_KEYS,
  TaskStartMemoryContextWorkflow,
  WORKFLOW_SCHEMA_VERSION,
  buildInjectableSummary,
  collectForbiddenKeys,
  deriveTaskFields
};
