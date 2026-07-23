'use strict';

const {
  DATA_TOOL_NAMES,
  RENDER_TOOL_NAMES,
  CONTEXT_VISIBILITIES,
  PROJECT_CONTEXT_REF_PATTERN_SOURCE,
  RESULT_REF_PATTERN_SOURCE,
  WIDGET_RESOURCE_URI,
  WIDGET_DTO_SCHEMA,
  deepFreeze
} = require('../../packages/chatgpt-r4-contracts');

const RESOURCE_URI = WIDGET_RESOURCE_URI;
const READ_ONLY_ANNOTATIONS = deepFreeze({
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: false
});
const IDEMPOTENT_READ_ONLY_ANNOTATIONS = deepFreeze({
  ...READ_ONLY_ANNOTATIONS,
  idempotentHint: true
});
const SECURITY_SCHEMES = deepFreeze([{ type: 'oauth2', scopes: ['memory.read'] }]);
const MODEL_WORKFLOW_INSTRUCTIONS = [
  'Use these tools only for an explicit project-memory request. Do not call any codex-memory tool for rewriting, translation, scheduling, general advice, or another memory-irrelevant task.',
  'A memory workflow requires an exact registered project_alias and one exact requested_visibility supplied by the user or trusted task context. If either value is missing, ask one concise clarification and call no tool.',
  'When the user or trusted task context explicitly labels a value as project_alias, copy it verbatim even if it matches an App, connector, or repository name.',
  'An unlabelled App display name, connector name, URL, client identifier, workspace name, or repository name is not a project_alias. Never use current, default, this-project, or another sentinel as an alias.',
  'Never choose task_start_context as a default or describe it as minimal disclosure.',
  'Before one read, call resolve_memory_context exactly once. Copy project_alias and requested_visibility exactly from the user-provided task context; never invent, normalize, suffix, enumerate, or probe alternatives.',
  'After a resolved context, choose exactly one read tool: memory_overview for counts or status; search_memory for one specific semantic fact; audit_memory for bounded access or receipt categories; prepare_memory_context for a task-start context package.',
  'The first read attempt consumes this workflow, even when it returns empty, denied, unavailable, or a transport error.',
  'After any read result or transport error, stop all codex-memory tool use immediately and answer the user; do not call another read tool or resolve again, and do not call render_memory_scope.',
  'Report only the receipt-backed result category or the single transport failure actually returned; never invent retry counts or claim another attempt occurred.',
  'A found search result is a retrieval candidate, not proof by itself. Treat relevance 0.5 as low-confidence and inconclusive unless the returned summary explicitly supports the requested fact.',
  'Receipt-bound denied or unavailable means a governed result receipt exists even when no usable project context was issued; it is not a transport failure.',
  'render_memory_scope is component-only and unavailable to the model.',
  'Never infer that memory was loaded without a tool result.'
].join(' ');

function descriptor({
  title,
  description,
  inputSchema,
  outputSchema,
  widget = false,
  widgetVisibility = ['model', 'app'],
  invocationText = null,
  idempotent = false
}) {
  const value = {
    title,
    description,
    inputSchema,
    outputSchema,
    securitySchemes: SECURITY_SCHEMES,
    annotations: idempotent ? IDEMPOTENT_READ_ONLY_ANNOTATIONS : READ_ONLY_ANNOTATIONS,
    _meta: { securitySchemes: SECURITY_SCHEMES }
  };
  if (widget) {
    const invoking = invocationText?.invoking || 'Preparing memory scope…';
    const invoked = invocationText?.invoked || 'Memory scope ready';
    Object.assign(value._meta, {
      ui: { resourceUri: RESOURCE_URI, visibility: widgetVisibility },
      'openai/outputTemplate': RESOURCE_URI,
      'openai/toolInvocation/invoking': invoking,
      'openai/toolInvocation/invoked': invoked
    });
  }
  return deepFreeze(value);
}

const toolDescriptors = deepFreeze({
  resolve_memory_context: descriptor({
    title: 'Resolve memory project context',
    description: 'Use this when an explicit project-memory request includes both an exact registered project alias and an exact visibility, and a short-lived governed context reference is required before one memory read. Copy both values verbatim and call once. If the user or trusted task context explicitly labels a value as project_alias, accept it verbatim even when it matches an App, connector, or repository name. An unlabelled App name, connector name, URL, client identifier, workspace name, opaque reference, or repository name is not a project alias. Never use current, default, this-project, or another sentinel; never guess or probe alternative aliases or visibilities. Never infer task_start_context as a default or call this tool to discover missing scope. If either exact value is missing, ask one concise clarification and call no tool. A denied, unavailable, or error result is terminal and must not be retried.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['project_alias'],
      properties: {
        project_alias: { type: 'string', minLength: 1, maxLength: 80, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$' },
        requested_visibility: { enum: CONTEXT_VISIBILITIES }
      }
    },
    outputSchema: contextResolutionOutputSchema(),
    widget: true,
    invocationText: {
      invoking: 'Resolving memory scope…',
      invoked: 'Memory scope resolved'
    }
  }),
  memory_overview: descriptor({
    title: 'View memory overview',
    description: 'Use this when a valid project_context_ref exists and the user needs only a bounded low-disclosure count or status overview. Choose this as the sole read tool for the task. Its first attempt consumes the one-read workflow; after any result or error, answer the user and do not call another memory read or resolve again; do not switch read tools.',
    inputSchema: contextInputSchema(),
    outputSchema: boundedStatusSchema('overview')
  }),
  search_memory: descriptor({
    title: 'Search governed project memory',
    description: 'Use this when a valid project_context_ref exists and the user needs one bounded project-aware semantic fact. Choose this as the sole read tool for the task. Its first attempt consumes the one-read workflow; after any result or error, answer the user and do not call another memory read or resolve again; do not switch read tools.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['project_context_ref', 'query'],
      properties: {
        project_context_ref: contextReferenceSchema(),
        query: { type: 'string', minLength: 1, maxLength: 2000 },
        limit: { type: 'integer', minimum: 1, maximum: 8 }
      }
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'result_count', 'results'],
      properties: {
        status: { type: 'string' },
        result_count: { type: 'integer', minimum: 0, maximum: 8 },
        results: {
          type: 'array',
          maxItems: 8,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['result_ref', 'summary', 'relevance'],
            properties: {
              result_ref: { type: 'string', pattern: RESULT_REF_PATTERN_SOURCE },
              summary: { type: 'string' },
              relevance: { type: 'number', minimum: 0, maximum: 1 }
            }
          }
        }
      }
    }
  }),
  audit_memory: descriptor({
    title: 'Audit governed memory access',
    description: 'Use this when a valid project_context_ref exists and the user needs only bounded low-disclosure access or receipt categories. Choose this as the sole read tool for the task. Its first attempt consumes the one-read workflow; after any result or error, answer the user and do not call another memory read or resolve again; do not switch read tools.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['project_context_ref'],
      properties: {
        project_context_ref: contextReferenceSchema(),
        event_limit: { type: 'integer', minimum: 1, maximum: 8 }
      }
    },
    outputSchema: boundedStatusSchema('audit')
  }),
  prepare_memory_context: descriptor({
    title: 'Prepare governed task context',
    description: 'Use this when a valid project_context_ref exists and the user needs one bounded project-aware task-start context package. Choose this as the sole read tool for the task. Its first attempt consumes the one-read workflow; after any result or error, answer the user and do not call another memory read or resolve again; do not switch read tools.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['project_context_ref'],
      properties: {
        project_context_ref: contextReferenceSchema(),
        task_summary: { type: 'string', minLength: 1, maxLength: 2000 }
      }
    },
    outputSchema: boundedStatusSchema('context')
  }),
  render_memory_scope: descriptor({
    title: 'Render memory scope status',
    description: 'Use this when the mounted codex-memory component needs to re-render an already validated memory-scope DTO. Component-only: the model must never call this tool, including for memory-irrelevant tasks, after a terminal read result, or as a fallback. This display does not authorize or perform a memory read.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['scope'],
      properties: { scope: WIDGET_DTO_SCHEMA }
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['scope'],
      properties: { scope: WIDGET_DTO_SCHEMA }
    },
    widget: true,
    widgetVisibility: ['app'],
    idempotent: true
  })
});

function contextInputSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['project_context_ref'],
    properties: { project_context_ref: contextReferenceSchema() }
  };
}

function contextReferenceSchema() {
  return { type: 'string', pattern: PROJECT_CONTEXT_REF_PATTERN_SOURCE };
}

function contextResolutionOutputSchema() {
  return {
    oneOf: [
      {
        type: 'object',
        additionalProperties: false,
        required: ['project_context_ref', 'safe_project_alias', 'expires_at', 'visibility_labels', 'context_status'],
        properties: {
          project_context_ref: contextReferenceSchema(),
          safe_project_alias: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$' },
          expires_at: { type: 'string' },
          visibility_labels: { type: 'array', items: { type: 'string' } },
          context_status: { const: 'resolved' }
        }
      },
      denialContextSchema('denied'),
      denialContextSchema('unavailable')
    ]
  };
}

function denialContextSchema(status) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['context_status'],
    properties: { context_status: { const: status } }
  };
}

function boundedStatusSchema(kind) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['status', 'kind', 'item_count'],
    properties: {
      status: { type: 'string' },
      kind: { const: kind },
      item_count: { type: 'integer', minimum: 0, maximum: 8 }
    }
  };
}

const candidateToolProfile = deepFreeze({
  id: 'chatgpt-r4-readonly-candidate-v1',
  stage: 'R4-B',
  default: false,
  activated: false,
  publicToolSurfaceExpanded: false,
  dataTools: DATA_TOOL_NAMES,
  renderTools: RENDER_TOOL_NAMES,
  writeTools: [],
  proposalTools: [],
  resourceUri: RESOURCE_URI,
  toolDescriptors
});

module.exports = {
  RESOURCE_URI,
  READ_ONLY_ANNOTATIONS,
  IDEMPOTENT_READ_ONLY_ANNOTATIONS,
  SECURITY_SCHEMES,
  MODEL_WORKFLOW_INSTRUCTIONS,
  candidateToolProfile,
  toolDescriptors
};
