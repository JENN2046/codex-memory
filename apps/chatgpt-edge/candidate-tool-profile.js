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
  'Read-only project-aware memory tools use a one-context/one-read workflow.',
  'Before reading, call resolve_memory_context exactly once.',
  'Copy project_alias and requested_visibility exactly from the user-provided task context; never invent, normalize, suffix, enumerate, or probe alternatives.',
  'If either value is missing, ask one concise clarification and do not call a memory tool.',
  'After a resolved context, choose exactly one read tool: memory_overview for counts or status; search_memory for one specific semantic fact; audit_memory for bounded access or receipt categories; prepare_memory_context for a task-start context package.',
  'The first read attempt ends this workflow. After any read result, including empty, denied, unavailable, or error, answer the user and do not call another read tool or resolve again.',
  'Use render_memory_scope only when the user asks to see scope status.',
  'Never infer that memory was loaded without a tool result.'
].join(' ');

function descriptor({ title, description, inputSchema, outputSchema, render = false, idempotent = false }) {
  const value = {
    title,
    description,
    inputSchema,
    outputSchema,
    securitySchemes: SECURITY_SCHEMES,
    annotations: idempotent ? IDEMPOTENT_READ_ONLY_ANNOTATIONS : READ_ONLY_ANNOTATIONS,
    _meta: { securitySchemes: SECURITY_SCHEMES }
  };
  if (render) {
    Object.assign(value._meta, {
      ui: { resourceUri: RESOURCE_URI, visibility: ['model', 'app'] },
      'openai/outputTemplate': RESOURCE_URI,
      'openai/toolInvocation/invoking': 'Preparing memory scope…',
      'openai/toolInvocation/invoked': 'Memory scope ready'
    });
  }
  return deepFreeze(value);
}

const toolDescriptors = deepFreeze({
  resolve_memory_context: descriptor({
    title: 'Resolve memory project context',
    description: 'Use this when the user has provided both an exact registered project alias and an exact visibility, and a short-lived governed context reference is required before one memory read. Copy both values verbatim, call once, and never guess or probe alternative aliases or visibilities; if either value is missing, ask the user instead.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['project_alias'],
      properties: {
        project_alias: { type: 'string', minLength: 1, maxLength: 80, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$' },
        requested_visibility: { enum: CONTEXT_VISIBILITIES }
      }
    },
    outputSchema: contextResolutionOutputSchema()
  }),
  memory_overview: descriptor({
    title: 'View memory overview',
    description: 'Use this when a valid project_context_ref exists and the user needs only a bounded low-disclosure count or status overview. Choose this as the sole read tool for the task; after any result, answer the user and do not call another memory read or resolve again.',
    inputSchema: contextInputSchema(),
    outputSchema: boundedStatusSchema('overview')
  }),
  search_memory: descriptor({
    title: 'Search governed project memory',
    description: 'Use this when a valid project_context_ref exists and the user needs one bounded project-aware semantic fact. Choose this as the sole read tool for the task; after any result, answer the user and do not call another memory read or resolve again.',
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
    description: 'Use this when a valid project_context_ref exists and the user needs only bounded low-disclosure access or receipt categories. Choose this as the sole read tool for the task; after any result, answer the user and do not call another memory read or resolve again.',
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
    description: 'Use this when a valid project_context_ref exists and the user needs one bounded project-aware task-start context package. Choose this as the sole read tool for the task; after any result, answer the user and do not call another memory read or resolve again.',
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
    description: 'Use this when resolve_memory_context has completed and the user explicitly asks to see the safe project alias, context expiry, visibility labels, and receipt status. This display is not a memory read and must not be used as a fallback or trigger another read.',
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
    render: true,
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
