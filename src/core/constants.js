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
        project_id: { type: 'string' },
        workspace_id: { type: 'string' },
        client_id: { type: 'string', enum: CLIENT_ID_VALUES },
        visibility: { type: 'string', enum: VISIBILITY_VALUES },
        task_id: { type: 'string' },
        conversation_id: { type: 'string' },
        retention_policy: { type: 'string' }
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
          description: 'Optional recall scope filter. project_id, workspace_id, client_id, and visibility restrict candidates whenever they are supplied; strict only records hard-isolation intent.',
          additionalProperties: false,
          properties: {
            project_id: { type: 'string', maxLength: 200, description: 'Restrict recall to records with this project_id.' },
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
    description: 'Operational overview of memory writes, recall activity, recent files, shadow sync, and adaptive profile. HTTP no-token calls return only a selected low-disclosure overview projection; bearer-token calls return the full overview.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        auditWindow: { type: 'integer', minimum: 10, maximum: 2000 },
        limit: { type: 'integer', minimum: 1, maximum: 50 }
      }
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
