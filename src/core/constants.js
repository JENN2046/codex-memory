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
        title: { type: 'string' },
        content: { type: 'string' },
        evidence: { type: 'string' },
        validated: { type: 'boolean' },
        reusable: { type: 'boolean' },
        tags: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } }
          ]
        },
        sensitivity: { type: 'string' },
        project_id: { type: 'string' },
        workspace_id: { type: 'string' },
        client_id: { type: 'string' },
        visibility: { type: 'string' },
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
    description: 'Search over the Codex process and knowledge diaries with diary-compatible recall output.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string' },
        target: { type: 'string', enum: ['process', 'knowledge', 'both'] },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
        include_content: { type: 'boolean' },
        context_text: { type: 'string' },
        scope: {
          type: 'object',
          additionalProperties: false,
          properties: {
            project_id: { type: 'string' },
            workspace_id: { type: 'string' },
            client_id: { type: 'string' },
            visibility: { type: 'string' },
            strict: { type: 'boolean' }
          }
        }
      },
      required: ['query']
    }
  },
  {
    name: 'memory_overview',
    title: 'Codex Memory Overview',
    description: 'Operational overview of memory writes, recall activity, recent files, shadow sync, and adaptive profile.',
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
