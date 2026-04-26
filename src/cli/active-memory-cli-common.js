const fs = require('node:fs/promises');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../app');

function parseCliArgs(argv = []) {
  const options = {
    full: false,
    inputFile: ''
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--full') {
      options.full = true;
      continue;
    }
    if (token === '--input-file') {
      options.inputFile = path.resolve(process.cwd(), argv[index + 1] || '');
      index += 1;
    }
  }

  return options;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function loadRawInput(options = {}) {
  if (options.inputFile) {
    return fs.readFile(options.inputFile, 'utf8');
  }
  return readStdin();
}

function createCliError(toolName, message, code = 'error', cause = null, meta = null) {
  const normalizedToolName = String(toolName || 'Tool').trim() || 'Tool';
  const normalizedMessage = String(message || '').trim();
  const finalMessage = normalizedMessage.startsWith(`[${normalizedToolName}]`)
    ? normalizedMessage
    : `[${normalizedToolName}] ${normalizedMessage}`;

  const error = new Error(finalMessage);
  error.name = 'VcpCliToolError';
  error.status = 'error';
  error.toolName = normalizedToolName;
  error.tool_name = normalizedToolName;
  error.code = code;
  error.error = finalMessage;
  error.result = null;
  if (meta && typeof meta === 'object' && !Array.isArray(meta) && Object.keys(meta).length > 0) {
    error.meta = { ...meta };
  }
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function parseJsonInput(toolName, rawInput) {
  try {
    return JSON.parse(rawInput);
  } catch (error) {
    throw createCliError(
      toolName,
      `无效的输入格式，无法解析JSON: ${String(rawInput || '')}`,
      'invalid-json',
      error
    );
  }
}

function normalizeCliError(toolName, error) {
  if (error && typeof error.toJSON === 'function') {
    return sanitizeCliErrorPayload(error.toJSON());
  }

  const normalizedToolName = String(error?.toolName || toolName || 'Tool').trim() || 'Tool';
  const normalizedCode = typeof error?.code === 'string' && error.code.trim()
    ? error.code.trim()
    : 'error';
  const rawMessage = String(error?.error || error?.message || 'Unknown error').trim() || 'Unknown error';
  const finalMessage = rawMessage.startsWith(`[${normalizedToolName}]`)
    ? rawMessage
    : `[${normalizedToolName}] ${rawMessage}`;

  return sanitizeCliErrorPayload({
    status: 'error',
    toolName: normalizedToolName,
    tool_name: normalizedToolName,
    code: normalizedCode,
    error: finalMessage,
    result: null,
    ...(error?.meta && typeof error.meta === 'object' && !Array.isArray(error.meta)
      ? { meta: error.meta }
      : {})
  });
}

function mergeCliErrorMeta(error, extraMeta) {
  if (!error || !extraMeta || typeof extraMeta !== 'object' || Array.isArray(extraMeta)) {
    return error;
  }

  const entries = Object.entries(extraMeta).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return error;
  }

  const currentMeta = error.meta && typeof error.meta === 'object' && !Array.isArray(error.meta)
    ? { ...error.meta }
    : {};

  error.meta = {
    ...Object.fromEntries(entries),
    ...currentMeta
  };
  return error;
}

const DONOR_META_FIELDS = [
  'toolName',
  'tool_name',
  'code',
  'command',
  'maid',
  'maidName',
  'agentId',
  'agent_id',
  'topicId',
  'topic_id',
  'topicName',
  'historyStatus',
  'resultCount',
  'result_count',
  'topicCount',
  'topic_count',
  'mode',
  'adapterStatus',
  'keyword',
  'rawKeyword',
  'raw_keyword',
  'blockedKeywords',
  'blocked_keyword_count',
  'effectiveKeywords',
  'effective_keyword_count',
  'effectiveKeywordText',
  'effective_keyword_text',
  'windowSize',
  'window_size',
  'limit',
  'top_n',
  'hasResults',
  'hasTopics',
  'rerankRequested',
  'rerank_requested',
  'rerankAttempted',
  'rerank_attempted',
  'rerankStatus',
  'rerank_status',
  'rerankMode',
  'rerank_mode',
  'rerankSuccessRate',
  'rerank_success_rate',
  'rerankError',
  'rerank_error',
  'outputText',
  'legacyResult'
];

function sanitizeCliFullPayload(response) {
  const payload = response && typeof response === 'object'
    ? { ...response }
    : {
        status: 'success',
        result: ''
      };

  const meta = {};
  for (const field of DONOR_META_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;
    meta[field] = payload[field];
    delete payload[field];
  }

  if (Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  return payload;
}

function sanitizeCliErrorPayload(payload) {
  const normalized = payload && typeof payload === 'object'
    ? { ...payload }
    : {
        status: 'error',
        error: '[Tool] Unknown error',
        result: null
      };

  const meta = normalized.meta && typeof normalized.meta === 'object' && !Array.isArray(normalized.meta)
    ? { ...normalized.meta }
    : {};
  delete normalized.meta;

  for (const field of ['toolName', 'tool_name', 'code']) {
    if (!Object.prototype.hasOwnProperty.call(normalized, field)) continue;
    meta[field] = normalized[field];
    delete normalized[field];
  }

  if (Object.keys(meta).length > 0) {
    normalized.meta = meta;
  }

  return normalized;
}

function buildSuccessPayload(response, options = {}) {
  if (options.full) {
    return sanitizeCliFullPayload(response);
  }

  return {
    status: 'success',
    result: typeof response?.result === 'string'
      ? response.result
      : String(response?.outputText || response?.legacyResult || '')
  };
}

async function withApplication(handler) {
  const app = createCodexMemoryApplication();
  await app.initialize();

  try {
    return await handler(app);
  } finally {
    await app.close();
  }
}

async function runActiveMemoryCli({ toolName, argv = [], execute, buildErrorMeta = null }) {
  let options = {};
  let rawInput = '';
  let parsedInput = null;

  try {
    options = parseCliArgs(argv);
    rawInput = await loadRawInput(options);
    parsedInput = parseJsonInput(toolName, rawInput);
    const response = await withApplication(async app => {
      try {
        return await execute(app, parsedInput, options);
      } catch (error) {
        if (typeof buildErrorMeta === 'function') {
          const extraMeta = await buildErrorMeta({
            app,
            toolName,
            options,
            rawInput,
            parsedInput,
            error,
            parseFailed: false
          });
          mergeCliErrorMeta(error, extraMeta);
        }
        throw error;
      }
    });
    const payload = buildSuccessPayload(response, options);
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  } catch (error) {
    if (typeof buildErrorMeta === 'function') {
      const extraMeta = await buildErrorMeta({
        app: null,
        toolName,
        options,
        rawInput,
        parsedInput,
        error,
        parseFailed: parsedInput === null
      });
      mergeCliErrorMeta(error, extraMeta);
    }
    const payload = normalizeCliError(toolName, error);
    process.stderr.write(`${JSON.stringify(payload)}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  createCliError,
  normalizeCliError,
  parseCliArgs,
  parseJsonInput,
  readStdin,
  runActiveMemoryCli,
  mergeCliErrorMeta,
  sanitizeCliErrorPayload,
  sanitizeCliFullPayload
};
