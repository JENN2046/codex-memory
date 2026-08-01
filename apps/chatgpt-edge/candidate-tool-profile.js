'use strict';

const {
  DATA_TOOL_NAMES,
  CHATGPT_EDGE_DATA_SCHEMA_VERSION,
  GOVERNED_READ_ATTEMPT_PUBLIC_PROJECTION_SCHEMA,
  GOVERNED_CONTEXT_RESOLUTION_PUBLIC_PROJECTION_SCHEMA,
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
  'No tool for rewriting, translation, formatting, math, checklists, summaries of user text, or echoing supplied scope.',
  'Memory retrieval needs explicitly labelled project_alias and requested_visibility. If either is missing, ask only for missing values; call no tool.',
  'Select one read: stored fact/record/content → search_memory; overview status/item_count → memory_overview; audit status/item_count → audit_memory; named task-start status/item_count → prepare_memory_context.',
  'Read tools do not return access, receipt, scope, or visibility details. Overview, audit, and task-start outputs contain only bounded status, kind, and response item_count.',
  'With both values present, call resolve_memory_context once, wait for project_context_ref, call the chosen read once, then answer. A denied, unavailable, empty, low-confidence, or error result is terminal.',
  'Treat current, default, this project, and unlabelled App or repository names as absent; a labelled alias may match those names. Copy both labelled values exactly. Use only returned fields; never infer another tool status or loaded memory.',
  'render_memory_scope is component-only and unavailable to the model.',
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
    title: 'Resolve exact memory scope',
    description: 'Use this when the current request explicitly supplies both exact project_alias and requested_visibility for stored-memory retrieval. Copy both values exactly and call once before one preselected read to obtain project_context_ref. If either value is absent, ask for it and call no tool.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['project_alias', 'requested_visibility'],
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
    title: 'Get overview availability and item count',
    description: 'Use this when resolve_memory_context just returned project_context_ref and the requested output is only the overview response status and item_count. It does not return memory-category counts, access, receipts, scope, or visibility details. Call once and answer from the first result.',
    inputSchema: contextInputSchema(),
    outputSchema: boundedStatusSchema('overview')
  }),
  search_memory: descriptor({
    title: 'Find one historical memory record',
    description: 'Use this when resolve_memory_context just returned project_context_ref and the requested output is one stored past fact, decision, event, or record. Historical records still use this tool when their subject contains audit, receipt, or canary. Call once with one bounded query and answer from the first result.',
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
      required: [
        'schema_version',
        'status',
        'result_count',
        'results',
        'attempt'
      ],
      properties: {
        schema_version: { const: CHATGPT_EDGE_DATA_SCHEMA_VERSION },
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
        },
        attempt: GOVERNED_READ_ATTEMPT_PUBLIC_PROJECTION_SCHEMA
      }
    }
  }),
  audit_memory: descriptor({
    title: 'Get audit availability and item count',
    description: 'Use this when resolve_memory_context just returned project_context_ref and the requested output is only the bounded audit response status and item_count. It does not return access, receipt, scope, visibility, or event details. Historical audit or receipt records use search_memory. Call once and answer from the first result.',
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
    title: 'Check named task-start context availability',
    description: 'Use this when resolve_memory_context just returned project_context_ref and the requested output is only the bounded task-start response status and item_count for a named task. It does not return context content. A stored-memory summary or fact uses search_memory instead. Call once and answer from the first result.',
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
        required: [
          'schema_version',
          'project_context_ref',
          'safe_project_alias',
          'expires_at',
          'visibility_labels',
          'context_status',
          'resolution'
        ],
        properties: {
          schema_version: {
            const: CHATGPT_EDGE_DATA_SCHEMA_VERSION
          },
          project_context_ref: contextReferenceSchema(),
          safe_project_alias: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$' },
          expires_at: { type: 'string' },
          visibility_labels: { type: 'array', items: { type: 'string' } },
          context_status: { const: 'resolved' },
          resolution: GOVERNED_CONTEXT_RESOLUTION_PUBLIC_PROJECTION_SCHEMA
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
    required: ['schema_version', 'context_status', 'resolution'],
    properties: {
      schema_version: {
        const: CHATGPT_EDGE_DATA_SCHEMA_VERSION
      },
      context_status: { const: status },
      resolution: GOVERNED_CONTEXT_RESOLUTION_PUBLIC_PROJECTION_SCHEMA
    }
  };
}

function boundedStatusSchema(kind) {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'schema_version',
      'status',
      'kind',
      'item_count',
      'attempt'
    ],
    properties: {
      schema_version: { const: CHATGPT_EDGE_DATA_SCHEMA_VERSION },
      status: { type: 'string' },
      kind: { const: kind },
      item_count: { type: 'integer', minimum: 0, maximum: 8 },
      attempt: GOVERNED_READ_ATTEMPT_PUBLIC_PROJECTION_SCHEMA
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
