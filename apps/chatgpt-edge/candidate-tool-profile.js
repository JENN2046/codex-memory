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
  'Use codex-memory only to retrieve stored project memory when both exact project_alias and requested_visibility are provided; otherwise answer directly or ask once for the missing value.',
  'Choose one read by requested output: audit_memory for access, receipt, scope, or visibility, including mixed overview requests; search_memory for one fact, decision, event, or historical record; prepare_memory_context for a named task-start package; otherwise memory_overview for counts, status, or availability. Resolve arguments alone leave selection to the requested output.',
  'Transform or summarize only user-supplied text without tools. Summarizing stored project memory follows the retrieval routes above.',
  'Call resolve_memory_context exactly once, wait for a resolved project_context_ref, call the chosen read exactly once, then answer. If resolve or read returns denied, unavailable, empty, low-confidence, or an error, answer from that result and call no further tool.',
  'Copy an explicitly labelled project_alias and requested_visibility exactly. The alias may match an App, connector, or repository name; an unlabelled name is not an alias. Never invent scope or use current, default, this-project, or task_start_context as a default.',
  'Use only returned fields. Do not infer uncalled tool status or loaded memory.',
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
    title: 'Resolve project memory scope',
    description: 'Use this first when the user asks to retrieve stored project memory and has supplied exact project_alias and requested_visibility. The workflow requires both values. Copy them exactly and call once to obtain a project_context_ref for one preselected read. If either value is missing, ask once without calling a tool. For rewriting, translation, arithmetic, formatting, checklist creation, or summarizing only user-supplied text, answer directly without this tool. A request to summarize stored project memory does use this workflow.',
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
    title: 'Get memory counts and status',
    description: 'Use this after resolve when the requested output is counts, status, or availability. When the requested output also includes access, receipts, scope, or visibility, choose audit_memory instead. Call once with the returned project_context_ref and answer from the first result.',
    inputSchema: contextInputSchema(),
    outputSchema: boundedStatusSchema('overview')
  }),
  search_memory: descriptor({
    title: 'Search one memory fact',
    description: 'Use this after resolve when the primary intent is one specific stored fact, decision, event, or historical record. Call once with the returned project_context_ref and one bounded semantic query, treat results as retrieval candidates, and answer from the first result without dereferencing result_ref.',
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
    title: 'Audit memory access and receipts',
    description: 'Use this after resolve when the requested output includes access authorization, receipts, audit, scope, or visibility. Choose it over memory_overview when a request mixes those outputs with counts, status, or availability. Resolve arguments alone do not select this tool. Call once with the returned project_context_ref and answer from the first result using only returned audit fields.',
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
    title: 'Prepare task-start memory context',
    description: 'Use this after resolve only when the user explicitly asks to prepare or assemble a bounded task-start context package for a named task. Call once with the returned project_context_ref and task summary, then answer from the first result. For a request to summarize stored project memory, select search_memory, audit_memory, or memory_overview from the routing priority instead.',
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
