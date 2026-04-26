function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return undefined;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function normalizeInteger(value, fallback, min = 1, max = 20) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeIso(value) {
  const parsed = new Date(value || '');
  return Number.isNaN(parsed.getTime()) ? 'unknown' : parsed.toISOString();
}

function formatZhDateTime(value, { includeSeconds = true } = {}) {
  const parsed = new Date(value || '');
  if (Number.isNaN(parsed.getTime())) return '未知';

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  };
  if (includeSeconds) {
    options.second = '2-digit';
  }

  return parsed.toLocaleString('zh-CN', options);
}

function formatSearchOutput(results = [], query = '') {
  if (!results.length) {
    return `[DeepMemo] 未找到与关键词“${String(query || '').trim() || 'query'}”相关的回忆。`;
  }

  return buildDeepMemoMemoryStrings(results).join('\n\n').trim();
}

function formatTopicListOutput(topics = [], maidName = '') {
  const titleName = String(maidName || topics[0]?.maidName || 'Agent').trim() || 'Agent';
  if (!topics.length) {
    return `[TopicMemo] ${titleName} 暂无任何话题记录。`;
  }

  const lines = [
    `## ${titleName} 的话题列表`,
    '',
    `共 ${topics.length} 个话题：`,
    ''
  ];

  topics.forEach((topic, index) => {
    lines.push(`${index + 1}. **${topic.topicName || topic.topicId || '未命名话题'}**${topic.locked ? ' 🔒' : ''}`);
    lines.push(`   - ID: \`${topic.topicId}\``);
    lines.push(`   - 创建时间: ${formatZhDateTime(topic.createdAt || topic.updatedAt, { includeSeconds: false })}`);
    lines.push('');
  });

  return lines.join('\n').trim();
}

function formatTopicMemoConversationContent(text = '') {
  return String(text || '')
    .split('\n')
    .map(line => {
      const match = line.match(/^([^:\n]+):\s*(.*)$/);
      if (!match) return line;
      const [, speaker, content] = match;
      return `**${speaker.trim()}**: ${content}`;
    })
    .join('\n')
    .trim();
}

function formatTopicContentOutput(topic) {
  if (!topic) {
    return '## 话题\n\n未找到该话题。请先使用 ListTopics 指令查询。';
  }

  const lines = [
    `## 话题：${topic.topicName || topic.topicId || '未命名话题'}`,
    `创建时间：${formatZhDateTime(topic.createdAt)}`,
    `消息数量：${topic.messageCount || 0} 条`,
    '',
    '---',
    '',
    formatTopicMemoConversationContent(topic.formattedContent || '')
  ];

  return lines.join('\n').trim();
}

function extractSearchQuery(rawInput, options, compatibilitySyntaxAdapter) {
  const directQuery = firstNonEmpty(
    options.query,
    options.keyword,
    options.key_word,
    options.KeyWord
  );

  if (typeof directQuery === 'string') {
    return directQuery.trim();
  }

  if (typeof rawInput === 'string') {
    const parsed = compatibilitySyntaxAdapter.parse(rawInput);
    return parsed.activeBlocks.join(' ') || parsed.query;
  }

  return '';
}

function normalizeSearchOptions(rawInput, options, compatibilitySyntaxAdapter) {
  const merged = rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)
    ? { ...rawInput, ...options }
    : { ...options };

  return {
    query: extractSearchQuery(rawInput, merged, compatibilitySyntaxAdapter),
    rawQuery: extractSearchQuery(rawInput, merged, compatibilitySyntaxAdapter),
    limit: normalizeInteger(firstNonEmpty(merged.limit, merged.top_n), 5),
    maidName: firstNonEmpty(merged.maidName, merged.maid, ''),
    agentId: firstNonEmpty(merged.agentId, ''),
    topicId: firstNonEmpty(merged.topicId, merged.topic_id, ''),
    currentTopicId: firstNonEmpty(merged.currentTopicId, merged.current_topic_id, ''),
    windowSize: normalizeInteger(firstNonEmpty(merged.windowSize, merged.window_size, merged.windowsize), 3, 1),
    includeContent: merged.includeContent ?? merged.include_content ?? true,
    excludeLatestTopic: merged.excludeLatestTopic ?? merged.exclude_latest_topic ?? merged.exclude_latest ?? true,
    allowAutoBackfill: merged.allowAutoBackfill ?? merged.allow_auto_backfill ?? true,
    rerankSearch: normalizeBoolean(
      firstNonEmpty(merged.rerankSearch, merged.rerank_search, merged.RerankSearch, merged.rerank),
      false
    )
  };
}

function normalizeCommand(rawInput, options = {}) {
  const merged = rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)
    ? { ...rawInput, ...options }
    : { ...options };
  const command = firstNonEmpty(merged.command, merged.Command, '');
  return typeof command === 'string' ? command.trim().toLowerCase() : '';
}

function getExplicitCommand(rawInput, options = {}) {
  const merged = rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)
    ? { ...rawInput, ...options }
    : { ...options };
  const command = firstNonEmpty(merged.command, merged.Command, '');
  return typeof command === 'string' ? command.trim() : '';
}

function hasExplicitCommand(rawInput, options = {}) {
  return !!getExplicitCommand(rawInput, options);
}

function requireNonEmptyString(value, errorMessage) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  throw new Error(errorMessage);
}

class VcpToolAdapterError extends Error {
  constructor({ toolName, message, code = 'error', cause = null, meta = null }) {
    const normalizedToolName = String(toolName || 'Tool').trim() || 'Tool';
    const normalizedMessage = String(message || '').trim();
    const finalMessage = normalizedMessage.startsWith(`[${normalizedToolName}]`)
      ? normalizedMessage
      : `[${normalizedToolName}] ${normalizedMessage}`;
    super(finalMessage);
    this.name = 'VcpToolAdapterError';
    this.status = 'error';
    this.toolName = normalizedToolName;
    this.tool_name = normalizedToolName;
    this.code = code;
    this.error = finalMessage;
    this.result = null;
    this.legacyError = finalMessage;
    this.meta = meta && typeof meta === 'object' && !Array.isArray(meta) && Object.keys(meta).length > 0
      ? { ...meta }
      : null;
    if (cause) {
      this.cause = cause;
    }
  }

  toJSON() {
    return {
      status: this.status,
      toolName: this.toolName,
      tool_name: this.tool_name,
      code: this.code,
      error: this.error,
      result: this.result,
      ...(this.meta ? { meta: this.meta } : {})
    };
  }
}

function createToolError(toolName, message, code = 'error', cause = null, meta = null) {
  return new VcpToolAdapterError({
    toolName,
    message,
    code,
    cause,
    meta
  });
}

function getAgentLabel(maidName = '', agentId = '') {
  return String(maidName || agentId || 'Agent').trim() || 'Agent';
}

function stripMatchingWrapper(value = '', openChar, closeChar = openChar) {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith(openChar) && trimmed.endsWith(closeChar)) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeKeywordUnit(segment = '') {
  let value = stripMatchingWrapper(String(segment || '').trim(), '"');
  value = stripMatchingWrapper(value, '\'');

  if (value.startsWith('(') && value.endsWith(')')) {
    const inner = value.slice(1, -1).trim();
    const separatorIndex = inner.lastIndexOf(':');
    if (separatorIndex > 0) {
      const rawWeight = inner.slice(separatorIndex + 1).trim();
      if (Number.isFinite(Number.parseFloat(rawWeight))) {
        value = inner.slice(0, separatorIndex).trim();
      }
    } else {
      value = inner;
    }
  } else if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    const separatorIndex = inner.lastIndexOf(':');
    value = separatorIndex > 0 && Number.isFinite(Number.parseFloat(inner.slice(separatorIndex + 1).trim()))
      ? inner.slice(0, separatorIndex).trim()
      : inner;
  } else if (value.startsWith('{') && value.endsWith('}')) {
    const inner = value.slice(1, -1).trim();
    const separatorIndex = inner.lastIndexOf(':');
    value = separatorIndex > 0 && Number.isFinite(Number.parseFloat(inner.slice(separatorIndex + 1).trim()))
      ? inner.slice(0, separatorIndex).trim()
      : inner;
  }

  return value.trim().toLowerCase();
}

function extractDeepMemoKeywordUnits(query = '') {
  const source = String(query || '');
  const segments = source.match(/"[^"]+"|'[^']+'|[^,，\s]+/g) || [];
  const units = [];

  for (const segment of segments) {
    const normalizedSegment = normalizeKeywordUnit(segment);
    if (!normalizedSegment) continue;

    if (normalizedSegment.includes('|')) {
      normalizedSegment.split('|').map(item => item.trim()).filter(Boolean).forEach(item => units.push(item));
      continue;
    }

    units.push(normalizedSegment);
  }

  return [...new Set(units)];
}

function getBlockedKeywordState(query = '', blockedKeywords = []) {
  const blockedSet = new Set(
    (blockedKeywords || [])
      .map(item => String(item || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const queryUnits = extractDeepMemoKeywordUnits(query);
  const blockedMatches = queryUnits.filter(unit => blockedSet.has(unit));
  const allowedUnits = queryUnits.filter(unit => !blockedSet.has(unit));
  return {
    blockedKeywords: blockedMatches,
    allowedKeywords: allowedUnits,
    queryUnits
  };
}

function buildEffectiveKeywordText(blockedKeywordState, fallbackQuery = '') {
  const allowed = Array.isArray(blockedKeywordState?.allowedKeywords)
    ? blockedKeywordState.allowedKeywords.filter(Boolean)
    : [];
  if (allowed.length > 0) {
    return allowed.join(', ');
  }
  return String(fallbackQuery || '').trim();
}

function buildDeepMemoMemoryLabel(memoryIndex) {
  return `[回忆片段${memoryIndex}]`;
}

function buildDeepMemoResultText(result, memoryIndex) {
  const label = buildDeepMemoMemoryLabel(memoryIndex);
  return `${label}:\n${result.content || result.snippet || ''}`.trim();
}

function buildDeepMemoStructuredResults(results = []) {
  return results.map((result, index) => {
    const memoryIndex = index + 1;
    const memoryLabel = buildDeepMemoMemoryLabel(memoryIndex);
    const resultText = buildDeepMemoResultText(result, memoryIndex);
    return {
      ...result,
      memoryIndex,
      memoryLabel,
      resultText,
      legacyResultText: resultText
    };
  });
}

function buildDeepMemoMemoryStrings(results = []) {
  return buildDeepMemoStructuredResults(results).map(result => result.resultText);
}

function formatEmptyTopicContentOutput(topic) {
  return `## 话题：${topic?.topicName || topic?.topicId || '未命名话题'}\n\n该话题暂无聊天记录。`;
}

class VcpActiveMemoryAdapter {
  constructor({ config = {}, activeRecallService, compatibilitySyntaxAdapter, rerankService = null }) {
    this.config = config;
    this.activeRecallService = activeRecallService;
    this.compatibilitySyntaxAdapter = compatibilitySyntaxAdapter;
    this.rerankService = rerankService;
  }

  getBlockedKeywords() {
    return Array.isArray(this.config.activeMemoryBlockedKeywords)
      ? this.config.activeMemoryBlockedKeywords
      : [];
  }

  shouldUseDeepMemoRerank(options = {}) {
    return normalizeBoolean(
      firstNonEmpty(options.rerankSearch, options.rerank_search, options.RerankSearch, options.rerank),
      !!this.config.activeMemoryRerankSearch
    );
  }

  async rerankDeepMemoResults(results = [], query = '', limit = 5) {
    if (!Array.isArray(results) || results.length === 0) {
      return {
        results: [],
        attempted: false,
        status: 'skipped',
        mode: 'none',
        successRate: null,
        error: null
      };
    }

    if (!this.rerankService?.isRemoteConfigured?.()) {
      return {
        results,
        attempted: false,
        status: 'skipped',
        mode: 'none',
        successRate: null,
        error: null
      };
    }

    const documents = results.map((result, index) => ({
      ...result,
      text: result.content || result.snippet || '',
      title: result.topicName || '',
      retrieval_rank: result.retrieval_rank || index + 1
    }));

    try {
      const reranked = await this.rerankService.remoteRerank(query, documents, limit, {});
      if (!reranked) {
        return {
          results,
          attempted: true,
          status: 'failed-fallback',
          mode: 'none',
          successRate: 0,
          error: 'empty rerank result'
        };
      }

      const status = reranked.successRate < 1 ? 'partial-fallback' : 'success';
      return {
        results: reranked.results || results,
        attempted: true,
        status,
        mode: reranked.mode || 'remote',
        successRate: reranked.successRate ?? null,
        error: null
      };
    } catch (error) {
      return {
        results,
        attempted: true,
        status: 'failed-fallback',
        mode: 'none',
        successRate: 0,
        error: error?.message || 'unknown rerank error'
      };
    }
  }

  async search(rawInput, options = {}) {
    const normalized = normalizeSearchOptions(rawInput, options, this.compatibilitySyntaxAdapter);
    if (!normalized.maidName) {
      throw createToolError('DeepMemo', "请求中缺少 'maid' 参数。", 'missing-maid');
    }
    if (!normalized.query) {
      throw createToolError('DeepMemo', "请求中缺少 'keyword' 参数。", 'missing-keyword');
    }
    const blockedKeywordState = getBlockedKeywordState(normalized.query, this.getBlockedKeywords());
    if (blockedKeywordState.queryUnits.length > 0 && blockedKeywordState.allowedKeywords.length === 0) {
      throw createToolError('DeepMemo', '关键词均被屏蔽，无有效搜索词。', 'all-keywords-blocked');
    }
    const effectiveKeywordText = buildEffectiveKeywordText(blockedKeywordState, normalized.query);
    const response = await this.activeRecallService.search({
      ...normalized,
      blockedKeywords: this.getBlockedKeywords()
    });
    if (response.agentStatus === 'agent-not-found') {
      throw createToolError(
        'DeepMemo',
        `未找到名为 "${getAgentLabel(normalized.maidName, normalized.agentId)}" 的Agent。`,
        'agent-not-found'
      );
    }

    const rerankRequested = this.shouldUseDeepMemoRerank(normalized);
    const rerankState = rerankRequested
      ? await this.rerankDeepMemoResults(response.results || [], normalized.query, normalized.limit)
      : {
          results: response.results || [],
          attempted: false,
          status: 'disabled',
          mode: 'none',
          successRate: null,
          error: null
        };

    const structuredResults = buildDeepMemoStructuredResults(rerankState.results || []);
    const memoryStrings = structuredResults.map(result => result.resultText);
    const formattedOutput = memoryStrings.length
      ? memoryStrings.join('\n\n').trim()
      : formatSearchOutput([], effectiveKeywordText);
    return {
      ...response,
      results: structuredResults,
      mode: 'deepmemo',
      status: 'success',
      toolName: 'DeepMemo',
      tool_name: 'DeepMemo',
      maid: normalized.maidName,
      maidName: normalized.maidName,
      agentId: response.agent?.agentId || normalized.agentId || null,
      agent_id: response.agent?.agentId || normalized.agentId || null,
      keyword: normalized.query,
      rawKeyword: normalized.rawQuery,
      raw_keyword: normalized.rawQuery,
      blockedKeywords: blockedKeywordState.blockedKeywords,
      blocked_keyword_count: blockedKeywordState.blockedKeywords.length,
      effectiveKeywords: blockedKeywordState.allowedKeywords,
      effective_keyword_count: blockedKeywordState.allowedKeywords.length,
      effectiveKeywordText,
      effective_keyword_text: effectiveKeywordText,
      windowSize: normalized.windowSize,
      window_size: normalized.windowSize,
      limit: normalized.limit,
      top_n: normalized.limit,
      resultCount: structuredResults.length,
      result_count: structuredResults.length,
      hasResults: structuredResults.length > 0,
      rerankRequested,
      rerank_requested: rerankRequested,
      rerankAttempted: rerankState.attempted,
      rerank_attempted: rerankState.attempted,
      rerankStatus: rerankState.status,
      rerank_status: rerankState.status,
      rerankMode: rerankState.mode,
      rerank_mode: rerankState.mode,
      rerankSuccessRate: rerankState.successRate,
      rerank_success_rate: rerankState.successRate,
      rerankError: rerankState.error,
      rerank_error: rerankState.error,
      memories: memoryStrings,
      result: formattedOutput,
      query: normalized.query,
      outputText: formattedOutput,
      legacyResult: formattedOutput
    };
  }

  async listTopics(options = {}) {
    const maidName = firstNonEmpty(options.maidName, options.maid, '');
    if (!maidName) {
      throw createToolError('TopicMemo', "请求中缺少 'maid' 参数。", 'missing-maid');
    }
    const response = await this.activeRecallService.listTopics({
      maidName,
      agentId: firstNonEmpty(options.agentId, ''),
      allowAutoBackfill: options.allowAutoBackfill ?? options.allow_auto_backfill ?? true
    });
    if (response.agentStatus === 'agent-not-found') {
      throw createToolError(
        'TopicMemo',
        `未找到名为 "${getAgentLabel(maidName, options.agentId || '')}" 的Agent。`,
        'agent-not-found'
      );
    }

    const formattedOutput = formatTopicListOutput(response.topics, maidName);
    return {
      ...response,
      mode: 'topicmemo:list',
      status: 'success',
      toolName: 'TopicMemo',
      tool_name: 'TopicMemo',
      command: 'ListTopics',
      maid: maidName,
      maidName: maidName,
      agentId: response.agent?.agentId || firstNonEmpty(options.agentId, null),
      agent_id: response.agent?.agentId || firstNonEmpty(options.agentId, null),
      topicCount: response.topics.length,
      topic_count: response.topics.length,
      hasTopics: response.topics.length > 0,
      result: formattedOutput,
      outputText: formattedOutput,
      legacyResult: formattedOutput
    };
  }

  async getTopicContent(options = {}) {
    const topicId = firstNonEmpty(options.topicId, options.topic_id, options.TopicId, '');
    if (!topicId) {
      throw createToolError('TopicMemo', "请求中缺少 'topic_id' 参数。", 'missing-topic-id');
    }
    const maidName = firstNonEmpty(options.maidName, options.maid, '');
    if (!maidName) {
      throw createToolError('TopicMemo', "请求中缺少 'maid' 参数。", 'missing-maid');
    }
    const response = await this.activeRecallService.getTopicContent({
      topicId,
      maidName,
      agentId: options.agentId || '',
      includeMessages: options.includeMessages ?? options.include_messages ?? true,
      allowAutoBackfill: options.allowAutoBackfill ?? options.allow_auto_backfill ?? true
    });

    if (response.topicStatus === 'agent-not-found') {
      throw createToolError(
        'TopicMemo',
        `未找到名为 "${getAgentLabel(maidName, options.agentId || '')}" 的Agent。`,
        'agent-not-found'
      );
    }

    if (response.topicStatus === 'topic-not-found' || !response.topic) {
      throw createToolError(
        'TopicMemo',
        `未找到 ID 为 "${topicId}" 的话题。可用的话题ID请先使用 ListTopics 指令查询。`,
        'topic-not-found'
      );
    }

    if (response.topicStatus === 'missing-history') {
      throw createToolError(
        'TopicMemo',
        `话题 "${response.topic.topicName}" 的聊天记录文件不存在。`,
        'missing-history'
      );
    }

    if (response.topicStatus === 'history-read-error') {
      throw createToolError(
        'TopicMemo',
        `无法读取话题 "${response.topic.topicName}" 的聊天记录: ${response.errorMessage || 'unknown error'}`,
        'history-read-error'
      );
    }

    const formattedOutput = response.topicStatus === 'empty-history'
      ? formatEmptyTopicContentOutput(response.topic)
      : formatTopicContentOutput(response.topic);
    return {
      ...response,
      mode: 'topicmemo:get',
      status: 'success',
      toolName: 'TopicMemo',
      tool_name: 'TopicMemo',
      command: 'GetTopicContent',
      maid: maidName,
      maidName,
      agentId: response.agent?.agentId || options.agentId || null,
      agent_id: response.agent?.agentId || options.agentId || null,
      topicId: response.topic.topicId,
      topic_id: response.topic.topicId,
      topicName: response.topic.topicName,
      historyStatus: response.topicStatus || 'ready',
      result: formattedOutput,
      outputText: formattedOutput,
      legacyResult: formattedOutput
    };
  }

  async execute(rawInput, options = {}) {
    const command = normalizeCommand(rawInput, options);
    const merged = rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)
      ? { ...rawInput, ...options }
      : { ...options };
    if (command === 'listtopics') {
      return this.listTopics(merged);
    }

    if (command === 'gettopiccontent') {
      return this.getTopicContent(merged);
    }

    if (hasExplicitCommand(rawInput, options)) {
      const explicitCommand = getExplicitCommand(rawInput, options);
      throw createToolError(
        'TopicMemo',
        `未知的指令: ${explicitCommand}，支持的指令: ListTopics, GetTopicContent`,
        'unknown-command'
      );
    }

    const inferredTopicId = firstNonEmpty(merged.topicId, merged.topic_id, merged.TopicId, '');
    if (inferredTopicId) {
      return this.getTopicContent(merged);
    }

    const commandlessQuery = extractSearchQuery(rawInput, merged, this.compatibilitySyntaxAdapter);
    if (!commandlessQuery && firstNonEmpty(merged.maidName, merged.maid, merged.agentId, '')) {
      return this.listTopics(merged);
    }

    return this.search(rawInput, options);
  }
}

module.exports = {
  VcpActiveMemoryAdapter
};
