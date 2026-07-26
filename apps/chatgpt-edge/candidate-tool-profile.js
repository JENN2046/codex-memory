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
  'Project-memory requests only; never use for irrelevant tasks: rewriting, translation, arithmetic, formatting, or summarizing text.',
  'Require exact project_alias and requested_visibility. If either is missing, ask one clarification and call no tool.',
  'Copy an explicitly labelled project_alias verbatim.',
  'One ordered workflow: resolve, wait for its result, one intent-matched read, then answer; the workflow is consumed and call no tool again.',
  'Omit missing categories. Never report an uncalled tool unavailable.',
  'Words such as project, memory, test, fix, or current do not by themselves authorize a memory tool. A vague request to read project memory without both exact labelled values is scope-missing, not permission to resolve.',
  'That labelled value remains exact even if it matches an App, connector, or repository name.',
  'An unlabelled App display name, connector name, URL, client identifier, workspace name, or repository name is not a project_alias. Never use current, default, this-project, or another sentinel as an alias.',
  'Never choose task_start_context as a default or describe it as minimal disclosure.',
  'Before one read, call resolve_memory_context exactly once. Copy project_alias and requested_visibility exactly from the user-provided task context; never invent, normalize, suffix, enumerate, or probe alternatives.',
  'Choose the intended read tool from the primary user intent before any call, but invoke only resolve_memory_context first. Wait for a successful resolved result. Never call memory_overview, search_memory, audit_memory, or prepare_memory_context before a returned project_context_ref.',
  'After a resolved context, choose exactly one read tool: memory_overview for counts or status; search_memory for one specific semantic fact; audit_memory for bounded access or receipt categories; prepare_memory_context for a task-start context package.',
  'Never use memory_overview or audit_memory as a preflight, capability probe, scope discovery step, availability check for another tool, or supplement before the intent-matched read.',
  'The first read attempt consumes this workflow, even when it returns empty, denied, unavailable, or a transport error.',
  'A read result is final even when it is found, empty, denied, unavailable, low-confidence, or incomplete for the user’s broader question. Do not refine, verify, expand, or dereference it with another codex-memory call.',
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
    title: 'Resolve explicit memory scope first',
    description: 'ROUTING GATE: call only for an explicit project-memory retrieval request that includes both an exact registered project alias and an exact visibility. Never call for rewriting, translation, arithmetic, formatting, checklist creation, or summarizing user-provided text, even when that text mentions a project, memory, tests, or a fix. Never call for a vague request such as current project memory when either exact labelled scope value is missing; ask one concise clarification and call no tool. Copy both values verbatim and call once. If the user or trusted task context explicitly labels a value as project_alias, accept it verbatim even when it matches an App, connector, or repository name. An unlabelled App name, connector name, URL, client identifier, workspace name, opaque reference, or repository name is not a project alias. Never use current, default, this-project, or another sentinel; never guess or probe alternative aliases or visibilities. Never infer task_start_context as a default or call this tool to discover missing scope. A denied, unavailable, or error result is terminal and must not be retried.',
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
    title: 'Read overview after resolve: counts/status only',
    description: 'AFTER RESOLVE ONLY: call only with the project_context_ref returned by the immediately preceding successful resolve_memory_context. Use solely when the primary user intent is a bounded low-disclosure memory or bridge count, availability, or status overview. This is not a preflight, scope resolver, access audit, semantic search, or task-context preparation tool. Never call it before resolve, while exact scope is missing, or before another read. Choose this as the sole read tool for the task and call it exactly once. Its first result or error is final: answer the user immediately. Never refine, verify, expand, or supplement it with another codex-memory call. Do not call another memory read or resolve again; do not switch read tools.',
    inputSchema: contextInputSchema(),
    outputSchema: boundedStatusSchema('overview')
  }),
  search_memory: descriptor({
    title: 'Search after resolve: one specific fact only',
    description: 'AFTER RESOLVE ONLY: call only with the project_context_ref returned by the immediately preceding successful resolve_memory_context. Use solely when the primary user intent is to retrieve one specific stored fact, decision, event, or historical testing record by semantic query. This is not a preflight, scope resolver, count/status overview, receipt audit, or task-context preparation tool. Never call it before resolve, while exact scope is missing, or before another read. Choose this as the sole read tool for the task and call it exactly once. Its first result or error is final: answer the user immediately. Never refine, verify, expand, or supplement it with another codex-memory call; never dereference a result_ref. Do not call another memory read or resolve again; do not switch read tools.',
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
    title: 'Audit after resolve: access/receipt only',
    description: 'AFTER RESOLVE ONLY: call only with the project_context_ref returned by the immediately preceding successful resolve_memory_context. Use solely when the primary user intent is bounded low-disclosure access authorization, visibility boundary, receipt, or audit categories. This is not a preflight, scope resolver, memory availability overview, semantic search, or task-context preparation tool. Never call it before resolve, while exact scope is missing, or before another read. Choose this as the sole read tool for the task and call it exactly once. Its first result or error is final: answer the user immediately using only returned audit fields. Omit unreturned categories; never label memory_overview or another uncalled tool unavailable. Never refine, verify, expand, or supplement it with another codex-memory call. Never fill a table with another codex-memory call. Do not call another memory read or resolve again; do not switch read tools.',
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
    title: 'Prepare after resolve: task context package only',
    description: 'AFTER RESOLVE ONLY: call only with the project_context_ref returned by the immediately preceding successful resolve_memory_context. Use solely when the primary user intent explicitly asks to prepare or assemble one bounded project-aware task-start context package for a named task. A generic request to load context, recall results, inspect status, or summarize project memory does not select this tool. This is not a preflight, scope resolver, count/status overview, receipt audit, or semantic history search. Never call it before resolve, while exact scope is missing, or before another read. Choose this as the sole read tool for the task and call it exactly once. Its first result or error is final: answer the user immediately. Never refine, verify, expand, or supplement it with another codex-memory call. Do not call another memory read or resolve again; do not switch read tools.',
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
