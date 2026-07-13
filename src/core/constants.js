const SERVER_NAME = 'vcp_codex_memory';
const SERVER_VERSION = '0.1.0';
const SUPPORTED_PROTOCOL_VERSIONS = new Set(['2025-03-26', '2025-06-18']);
const DEFAULT_PROTOCOL_VERSION = '2025-06-18';

const PROCESS_DIARY_NAME = 'Codex';
const KNOWLEDGE_DIARY_NAME = 'Codex的知识';

const WRITE_AUDIT_FILE_NAME = 'codex-memory-bridge.jsonl';
const RECALL_AUDIT_FILE_NAME = 'codex-memory-recall.jsonl';
const SQLITE_FILE_NAME = 'codex-memory.sqlite';
const VECTOR_INDEX_FILE_NAME = 'memory-vectors.json';
const CHAT_INDEX_FILE_NAME = 'chat-history-index.json';
const CANDIDATE_CACHE_FILE_NAME = 'candidate-cache.json';

const CLIENT_ID_VALUES = ['codex', 'claude', 'omc', 'manual'];
const VISIBILITY_VALUES = ['private', 'workspace', 'project', 'shared'];

function boundedString(maxLength = 200) {
  return { type: 'string', minLength: 1, maxLength };
}

const TOOL_DEFINITIONS = [
  {
    name: 'record_memory',
    title: 'Record Codex Memory',
    description: 'Write normal Codex memory through the standalone Codex memory core. Do not use this for dream diary entries.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        target: { type: 'string', enum: ['process', 'knowledge'] },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        content: { type: 'string', minLength: 1, maxLength: 20000 },
        evidence: { type: 'string', minLength: 1, maxLength: 8000 },
        validated: { type: 'boolean' },
        reusable: { type: 'boolean' },
        tags: {
          oneOf: [
            { type: 'string', maxLength: 80 },
            { type: 'array', items: { type: 'string', maxLength: 80 }, maxItems: 30 }
          ]
        },
        sensitivity: { type: 'string', maxLength: 80 },
        scope_id: { type: 'string', maxLength: 200 },
        project_id: { type: 'string', maxLength: 200 },
        workspace_id: { type: 'string', maxLength: 200 },
        client_id: { type: 'string', enum: CLIENT_ID_VALUES, maxLength: 200 },
        visibility: { type: 'string', enum: VISIBILITY_VALUES, maxLength: 200 },
        task_id: { type: 'string', maxLength: 200 },
        conversation_id: { type: 'string', maxLength: 200 },
        retention_policy: { type: 'string', maxLength: 200 }
      },
      required: ['target', 'title', 'content', 'evidence', 'validated', 'reusable', 'sensitivity']
    }
  },
  {
    name: 'search_memory',
    title: 'Search Codex Memory',
    description: 'Search over the Codex process and knowledge diaries with diary-compatible recall output. When scope is supplied, scope fields are applied as recall filters; strict marks the scoped search as a hard isolation intent for audit/overview.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 1000 },
        target: { type: 'string', enum: ['process', 'knowledge', 'both'] },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
        include_content: { type: 'boolean' },
        context_text: { type: 'string', maxLength: 8000 },
        scope: {
          type: 'object',
          description: 'Optional recall scope filter. scope_id, project_id, workspace_id, client_id, and visibility restrict candidates whenever they are supplied; strict only records hard-isolation intent.',
          additionalProperties: false,
          properties: {
            project_id: { type: 'string', maxLength: 200, description: 'Restrict recall to records with this project_id.' },
            scope_id: { type: 'string', maxLength: 200, description: 'Restrict recall to records with this scope_id.' },
            workspace_id: { type: 'string', maxLength: 200, description: 'Restrict recall to records with this workspace_id. The raw value is not written to recall audit summaries.' },
            client_id: { type: 'string', enum: CLIENT_ID_VALUES, maxLength: 200, description: 'Restrict recall to records with this client_id.' },
            visibility: {
              oneOf: [
                { type: 'string', enum: VISIBILITY_VALUES },
                { type: 'array', items: { type: 'string', enum: VISIBILITY_VALUES } }
              ],
              description: 'Restrict recall to one or more visibility values.'
            },
            strict: { type: 'boolean', description: 'Audit/overview marker for hard-isolation intent; scope fields still filter when strict is false or omitted.' }
          }
        }
      },
      required: ['query']
    }
  },
  {
    name: 'memory_overview',
    title: 'Codex Memory Overview',
    description: 'Operational overview of memory writes, recall activity, shadow sync, and adaptive profile. HTTP no-token calls return only a selected low-disclosure overview projection; bearer-token HTTP calls return a bounded low-disclosure overview projection by default.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        auditWindow: { type: 'integer', minimum: 10, maximum: 2000 },
        limit: { type: 'integer', minimum: 1, maximum: 50 }
      }
    }
  },
  {
    name: 'audit_memory',
    title: 'Audit Memory Readonly',
    description: 'Readonly bounded audit explanation for memory visibility, hidden, and suppression decisions. Returns only low-disclosure aggregate projection fields and never returns raw memory, raw audit rows, filesystem paths, provider payloads, token material, or memory content.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        audit_family: { type: 'string', enum: ['write', 'recall', 'governance', 'all'] },
        window: { type: 'integer', minimum: 1, maximum: 200 },
        scope: {
          type: 'object',
          additionalProperties: false,
          properties: {
            project_id: { type: 'string', maxLength: 200 },
            scope_id: { type: 'string', maxLength: 200 },
            workspace_id: { type: 'string', maxLength: 200 },
            workspace_id_present: { type: 'boolean' },
            client_id: { type: 'string', maxLength: 200 },
            visibility: { type: 'string', maxLength: 200 },
            task_id: { type: 'string', maxLength: 200 }
          }
        },
        include_raw: { type: 'boolean', enum: [false] }
      }
    }
  },
  {
    name: 'prepare_memory_context',
    title: 'Prepare Memory Context',
    description: 'Build a read-only, low-disclosure task-start memory context package from bounded governed recall, overview, and audit projections. Does not perform durable mutation or production write.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        task: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string', maxLength: 300 },
            user_request: { type: 'string', maxLength: 4000 },
            project_id: { type: 'string', maxLength: 200 },
            scope_id: { type: 'string', maxLength: 200 },
            workspace_id: { type: 'string', maxLength: 200 },
            client_id: { type: 'string', enum: CLIENT_ID_VALUES, maxLength: 200 },
            visibility: { type: 'string', enum: VISIBILITY_VALUES, maxLength: 200 },
            repo: { type: 'string', maxLength: 300 },
            current_branch: { type: 'string', maxLength: 200 },
            current_files: {
              type: 'array',
              items: { type: 'string', maxLength: 300 },
              maxItems: 30
            },
            strict_scope: { type: 'boolean' }
          }
        },
        options: {
          type: 'object',
          additionalProperties: false,
          properties: {
            max_items: { type: 'integer', minimum: 1, maximum: 10 },
            max_bytes: { type: 'integer', minimum: 1200, maximum: 24000 },
            include_risks: { type: 'boolean' },
            include_user_preferences: { type: 'boolean' }
          }
        }
      }
    }
  },
  {
    name: 'propose_memory_delta',
    title: 'Propose Memory Delta',
    description: 'Create a low-disclosure, proposal-only task-end memory delta package with staging, audit receipt, rollback posture, and operator-only commit contract draft. Does not perform durable mutation, provider call, production write, or public commit.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        task_id: { type: 'string', pattern: '^CM-[0-9]{4}$', maxLength: 40 },
        task: {
          type: 'object',
          additionalProperties: false,
          properties: {
            task_id: { type: 'string', pattern: '^CM-[0-9]{4}$', maxLength: 40 },
            title: { type: 'string', maxLength: 220 },
            project_id: { type: 'string', maxLength: 200 },
            workspace_id: { type: 'string', maxLength: 200 },
            client_id: { type: 'string', enum: CLIENT_ID_VALUES, maxLength: 200 },
            visibility: { type: 'string', enum: VISIBILITY_VALUES, maxLength: 200 }
          }
        },
        evidence_refs: {
          oneOf: [
            { type: 'string', maxLength: 180 },
            { type: 'array', items: { type: 'string', maxLength: 180 }, maxItems: 8 }
          ]
        },
        candidates: {
          type: 'array',
          maxItems: 5,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              target: { type: 'string', enum: ['process', 'knowledge'] },
              intent: { type: 'string', minLength: 1, maxLength: 220 },
              summary: { type: 'string', maxLength: 220 },
              title: { type: 'string', maxLength: 220 },
              evidence_refs: {
                oneOf: [
                  { type: 'string', maxLength: 160 },
                  { type: 'array', items: { type: 'string', maxLength: 160 }, maxItems: 3 }
                ]
              },
              tags: {
                oneOf: [
                  { type: 'string', maxLength: 60 },
                  { type: 'array', items: { type: 'string', maxLength: 60 }, maxItems: 8 }
                ]
              },
              reusable: { type: 'boolean' },
              sensitivity: { type: 'string', maxLength: 80 }
            }
          }
        },
        candidate_memories: {
          type: 'array',
          maxItems: 5,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              target: { type: 'string', enum: ['process', 'knowledge'] },
              intent: { type: 'string', minLength: 1, maxLength: 220 },
              summary: { type: 'string', maxLength: 220 },
              title: { type: 'string', maxLength: 220 },
              evidence_refs: {
                oneOf: [
                  { type: 'string', maxLength: 160 },
                  { type: 'array', items: { type: 'string', maxLength: 160 }, maxItems: 3 }
                ]
              },
              tags: {
                oneOf: [
                  { type: 'string', maxLength: 60 },
                  { type: 'array', items: { type: 'string', maxLength: 60 }, maxItems: 8 }
                ]
              },
              reusable: { type: 'boolean' },
              sensitivity: { type: 'string', maxLength: 80 }
            }
          }
        },
        review_decision: { type: 'string', enum: ['accept', 'reject'] },
        options: {
          type: 'object',
          additionalProperties: false,
          properties: {
            proposal_only: { type: 'boolean', enum: [true] }
          }
        }
      }
    }
  },
  {
    name: 'validate_memory',
    title: 'Validate Memory',
    description: 'Controlled mutation public MCP tool registered under exact approval. Public calls are dry-run bounded by default; confirmed durable mutation requires a separate exact mutation approval and is rejected on this public path.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        memory_id: boundedString(200),
        reason: boundedString(1000),
        evidence: boundedString(4000),
        actor_client_id: boundedString(200),
        request_source: boundedString(200),
        dry_run: { type: 'boolean' },
        confirm: { type: 'boolean' }
      },
      required: ['memory_id', 'reason', 'evidence', 'actor_client_id', 'request_source']
    }
  },
  {
    name: 'tombstone_memory',
    title: 'Tombstone Memory',
    description: 'Controlled mutation public MCP tool registered under exact approval. Public calls are dry-run bounded by default; confirmed durable tombstone mutation requires a separate exact mutation approval and is rejected on this public path.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        memory_id: boundedString(200),
        reason: boundedString(1000),
        evidence: boundedString(4000),
        tombstone_reason: boundedString(1000),
        actor_client_id: boundedString(200),
        request_source: boundedString(200),
        dry_run: { type: 'boolean' },
        confirm: { type: 'boolean' }
      },
      required: ['memory_id', 'reason', 'evidence', 'tombstone_reason', 'actor_client_id', 'request_source']
    }
  },
  {
    name: 'supersede_memory',
    title: 'Supersede Memory',
    description: 'Controlled mutation public MCP tool registered under exact approval. Public calls are dry-run bounded by default; confirmed durable supersede mutation requires a separate exact mutation approval and is rejected on this public path.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        old_memory_id: boundedString(200),
        new_memory_id: boundedString(200),
        reason: boundedString(1000),
        evidence: boundedString(4000),
        supersedes_link: boundedString(200),
        superseded_by_link: boundedString(200),
        actor_client_id: boundedString(200),
        request_source: boundedString(200),
        dry_run: { type: 'boolean' },
        confirm: { type: 'boolean' }
      },
      required: [
        'old_memory_id',
        'new_memory_id',
        'reason',
        'evidence',
        'supersedes_link',
        'superseded_by_link',
        'actor_client_id',
        'request_source'
      ]
    }
  }
];

function getTargetForDiaryName(dbName) {
  if (dbName === PROCESS_DIARY_NAME) return 'process';
  if (dbName === KNOWLEDGE_DIARY_NAME) return 'knowledge';
  return null;
}

function getDiaryNameForTarget(target) {
  return target === 'knowledge' ? KNOWLEDGE_DIARY_NAME : PROCESS_DIARY_NAME;
}

function getDiaryNamesForTarget(target = 'both') {
  if (target === 'process') return [PROCESS_DIARY_NAME];
  if (target === 'knowledge') return [KNOWLEDGE_DIARY_NAME];
  return [PROCESS_DIARY_NAME, KNOWLEDGE_DIARY_NAME];
}

module.exports = {
  CANDIDATE_CACHE_FILE_NAME,
  CHAT_INDEX_FILE_NAME,
  DEFAULT_PROTOCOL_VERSION,
  KNOWLEDGE_DIARY_NAME,
  PROCESS_DIARY_NAME,
  RECALL_AUDIT_FILE_NAME,
  SERVER_NAME,
  SERVER_VERSION,
  SQLITE_FILE_NAME,
  SUPPORTED_PROTOCOL_VERSIONS,
  TOOL_DEFINITIONS,
  VECTOR_INDEX_FILE_NAME,
  WRITE_AUDIT_FILE_NAME,
  getDiaryNameForTarget,
  getDiaryNamesForTarget,
  getTargetForDiaryName
};
