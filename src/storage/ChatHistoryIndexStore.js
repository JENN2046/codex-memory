const fs = require('node:fs/promises');
const path = require('node:path');

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .match(/[a-z0-9_\u4e00-\u9fff]+/g) || [];
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeIsoTimestamp(value, fallback = null) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function normalizePathValue(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  return path.normalize(value.trim());
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function stripHtml(content) {
  return decodeHtmlEntities(content)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|li|br|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

function truncateText(text, maxChars = 320) {
  const source = String(text || '').trim();
  if (source.length <= maxChars) return source;
  return `${source.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

function toTimestampNumber(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getWindowSpan(start, end) {
  const normalizedStart = Number.parseInt(String(start ?? 0), 10);
  const normalizedEnd = Number.parseInt(String(end ?? 0), 10);
  const safeStart = Number.isFinite(normalizedStart) ? normalizedStart : 0;
  const safeEnd = Number.isFinite(normalizedEnd) ? normalizedEnd : 0;
  return Math.max(0, safeEnd - safeStart);
}

function normalizeMessage(entry, index) {
  if (!entry || typeof entry !== 'object') return null;
  const rawContent = typeof entry.content === 'string' ? entry.content : '';
  const cleanContent = stripHtml(rawContent);
  if (!cleanContent) return null;

  return {
    index,
    role: typeof entry.role === 'string' ? entry.role : 'unknown',
    content: rawContent,
    cleanContent,
    createdAt: normalizeIsoTimestamp(entry.createdAt || entry.timestamp || entry.time, null)
  };
}

function normalizeTopic(topic = {}) {
  return {
    id: String(topic.id || '').trim(),
    name: String(topic.name || topic.id || '').trim() || 'Untitled topic',
    createdAt: normalizeIsoTimestamp(topic.createdAt, null),
    locked: !!topic.locked
  };
}

function getSpeakerName(role, userName, maidName) {
  if (role === 'user') return userName || 'User';
  if (role === 'assistant') return maidName || 'Assistant';
  return role || 'Unknown';
}

function formatMessageWindow(messages = [], userName, maidName) {
  return messages
    .map(message => `${getSpeakerName(message.role, userName, maidName)}: ${message.cleanContent}`)
    .join('\n')
    .trim();
}

function buildTopicPayloadFromConversation(conversation, includeMessages = true) {
  const formattedContent = formatMessageWindow(conversation.messages, conversation.userName, conversation.maidName);
  return {
    agentId: conversation.agentId,
    maidName: conversation.maidName,
    userName: conversation.userName,
    topicId: conversation.topicId,
    topicName: conversation.topicName,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    locked: !!conversation.locked,
    sourceFile: conversation.sourceFile,
    messageCount: conversation.messages.length,
    messages: includeMessages ? conversation.messages : undefined,
    formattedContent
  };
}

function splitDeepMemoClauses(query = '') {
  const source = String(query || '');
  const clauses = [];
  let current = '';
  let activeQuote = '';
  let roundDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;

  for (const character of source) {
    if (activeQuote) {
      current += character;
      if (character === activeQuote) {
        activeQuote = '';
      }
      continue;
    }

    if (character === '"' || character === '\'') {
      activeQuote = character;
      current += character;
      continue;
    }

    if (character === '(') roundDepth += 1;
    if (character === ')' && roundDepth > 0) roundDepth -= 1;
    if (character === '[') squareDepth += 1;
    if (character === ']' && squareDepth > 0) squareDepth -= 1;
    if (character === '{') curlyDepth += 1;
    if (character === '}' && curlyDepth > 0) curlyDepth -= 1;

    if ((character === ',' || character === '，') && roundDepth === 0 && squareDepth === 0 && curlyDepth === 0) {
      if (current.trim()) clauses.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  if (current.trim()) clauses.push(current.trim());
  return clauses;
}

function stripMatchingQuotes(value = '') {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseWeightedSegment(segment = '') {
  const trimmed = String(segment || '').trim();
  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) return null;

  const inner = trimmed.slice(1, -1).trim();
  const separatorIndex = inner.lastIndexOf(':');
  if (separatorIndex <= 0) return null;

  const term = stripMatchingQuotes(inner.slice(0, separatorIndex));
  const rawWeight = inner.slice(separatorIndex + 1).trim();
  const weight = Number.parseFloat(rawWeight);
  if (!term || !Number.isFinite(weight)) return null;

  return {
    term: term.toLowerCase(),
    weight
  };
}

function parseNegativeSegment(segment = '') {
  const trimmed = String(segment || '').trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [];

  let inner = trimmed.slice(1, -1).trim();
  const separatorIndex = inner.lastIndexOf(':');
  if (separatorIndex > 0) {
    const rawWeight = inner.slice(separatorIndex + 1).trim();
    if (Number.isFinite(Number.parseFloat(rawWeight))) {
      inner = inner.slice(0, separatorIndex).trim();
    }
  }

  const terms = inner.includes('|')
    ? inner.split('|')
    : inner.split(/[,，]/g);

  return unique(
    terms
      .map(term => stripMatchingQuotes(term).toLowerCase())
      .filter(Boolean)
  );
}

function parseOptionalGroupSegment(segment = '') {
  const trimmed = String(segment || '').trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  let inner = trimmed.slice(1, -1).trim();
  let weight = 1;
  const separatorIndex = inner.lastIndexOf(':');
  if (separatorIndex > 0) {
    const rawWeight = inner.slice(separatorIndex + 1).trim();
    const parsedWeight = Number.parseFloat(rawWeight);
    if (Number.isFinite(parsedWeight)) {
      inner = inner.slice(0, separatorIndex).trim();
      weight = parsedWeight;
    }
  }

  const terms = unique(
    inner
      .split('|')
      .map(term => stripMatchingQuotes(term).toLowerCase())
      .filter(Boolean)
  );

  if (terms.length < 2) return null;
  return { terms, weight };
}

function countOccurrences(text, term) {
  if (!text || !term) return 0;

  let count = 0;
  let startIndex = 0;
  while (startIndex < text.length) {
    const matchIndex = text.indexOf(term, startIndex);
    if (matchIndex < 0) break;
    count += 1;
    startIndex = matchIndex + term.length;
  }
  return count;
}

function parseDeepMemoQuery(query = '') {
  const source = String(query || '');
  const rawClauses = splitDeepMemoClauses(source);
  let working = source;
  const phrases = [];
  const weightedTerms = [];
  const optionalGroups = [];
  const negativeTerms = [];

  working = working.replace(/"([^"]+)"|'([^']+)'/g, (_, left, right) => {
    const phrase = String(left || right || '').trim().toLowerCase();
    if (phrase) phrases.push(phrase);
    return ' ';
  });

  working = working.replace(/\(([^:()]+):([0-9.]+)\)/g, (_, term, rawWeight) => {
    const parsed = parseWeightedSegment(`(${term}:${rawWeight})`);
    if (parsed) weightedTerms.push(parsed);
    return ' ';
  });

  working = working.replace(/\[([^[\]]+)\]/g, (_, termGroup) => {
    for (const term of String(termGroup || '').split(/[|,锛孿s]+/g)) {
      const normalizedTerm = term.trim().toLowerCase();
      if (normalizedTerm) negativeTerms.push(normalizedTerm);
    }
    return ' ';
  });

  working = working.replace(/\{([^{}:]+(?:\|[^{}:]+)+)(?::([0-9.]+))?\}/g, (_, rawTerms, rawWeight) => {
    const terms = String(rawTerms || '')
      .split('|')
      .map(item => item.trim().toLowerCase())
      .filter(Boolean);
    if (terms.length > 0) {
      optionalGroups.push({
        terms,
        weight: Number.isFinite(Number.parseFloat(rawWeight)) ? Number.parseFloat(rawWeight) : 1
      });
    }
    return ' ';
  });

  for (const clause of rawClauses) {
    const trimmedClause = String(clause || '').trim();
    if (!trimmedClause) continue;

    const weightedClause = parseWeightedSegment(trimmedClause);
    if (weightedClause) {
      weightedTerms.push(weightedClause);
      continue;
    }

    const optionalGroupClause = parseOptionalGroupSegment(trimmedClause);
    if (optionalGroupClause) {
      optionalGroups.push(optionalGroupClause);
      continue;
    }

    const negativeClauseTerms = parseNegativeSegment(trimmedClause);
    if (negativeClauseTerms.length > 0) {
      negativeTerms.push(...negativeClauseTerms);
    }
  }

  const basicTerms = unique(tokenize(working.replace(/[，,]/g, ' ')));
  const normalizedWeightedTerms = unique(
    weightedTerms.map(item => JSON.stringify({
      term: item.term,
      weight: item.weight
    }))
  ).map(item => JSON.parse(item));
  const normalizedOptionalGroups = unique(
    optionalGroups.map(item => JSON.stringify({
      terms: item.terms,
      weight: item.weight
    }))
  ).map(item => JSON.parse(item));
  const positiveClauses = rawClauses.filter(clause => {
    const trimmed = String(clause || '').trim();
    return !!trimmed && !(trimmed.startsWith('[') && trimmed.endsWith(']'));
  });

  return {
    raw: source,
    rawClauses,
    positiveClauseCount: positiveClauses.length,
    phrases: unique(phrases),
    weightedTerms: normalizedWeightedTerms,
    optionalGroups: normalizedOptionalGroups,
    negativeTerms: unique(negativeTerms),
    basicTerms
  };
}

function filterDeepMemoQuery(parsedQuery, blockedKeywords = []) {
  const blockedSet = new Set(
    (blockedKeywords || [])
      .map(item => String(item || '').trim().toLowerCase())
      .filter(Boolean)
  );

  if (blockedSet.size === 0) {
    return {
      ...parsedQuery,
      blockedKeywords: []
    };
  }

  const blockedKeywordsUsed = new Set();
  const phrases = (parsedQuery.phrases || []).filter(phrase => {
    const blocked = blockedSet.has(phrase);
    if (blocked) blockedKeywordsUsed.add(phrase);
    return !blocked;
  });

  const weightedTerms = [];
  for (const weighted of parsedQuery.weightedTerms || []) {
    const term = String(weighted.term || '').trim().toLowerCase();
    if (!term) continue;
    if (blockedSet.has(term)) {
      blockedKeywordsUsed.add(term);
      continue;
    }
    weightedTerms.push(weighted);
  }

  const optionalGroups = [];
  for (const group of parsedQuery.optionalGroups || []) {
    const survivingTerms = (group.terms || []).filter(term => {
      const normalized = String(term || '').trim().toLowerCase();
      if (!normalized) return false;
      const blocked = blockedSet.has(normalized);
      if (blocked) blockedKeywordsUsed.add(normalized);
      return !blocked;
    });

    if (survivingTerms.length > 1) {
      optionalGroups.push({
        ...group,
        terms: survivingTerms
      });
      continue;
    }

    if (survivingTerms.length === 1) {
      weightedTerms.push({
        term: survivingTerms[0],
        weight: Number.isFinite(Number(group.weight)) ? Number(group.weight) : 1
      });
    }
  }

  const basicTerms = (parsedQuery.basicTerms || []).filter(term => {
    const normalized = String(term || '').trim().toLowerCase();
    if (!normalized) return false;
    const blocked = blockedSet.has(normalized);
    if (blocked) blockedKeywordsUsed.add(normalized);
    return !blocked;
  });

  const negativeTerms = (parsedQuery.negativeTerms || []).filter(term => {
    const normalized = String(term || '').trim().toLowerCase();
    if (!normalized) return false;
    return !blockedSet.has(normalized);
  });

  const positiveClauseCount = (() => {
    const componentCount = phrases.length
      + weightedTerms.length
      + optionalGroups.length
      + (basicTerms.length > 0 ? 1 : 0);
    if (componentCount === 0) return 0;
    const original = Number.parseInt(String(parsedQuery.positiveClauseCount || 0), 10) || 0;
    return Math.max(1, original > 0 ? Math.min(original, componentCount) : componentCount);
  })();

  return {
    ...parsedQuery,
    phrases,
    weightedTerms: unique(
      weightedTerms.map(item => JSON.stringify({
        term: item.term,
        weight: item.weight
      }))
    ).map(item => JSON.parse(item)),
    optionalGroups: unique(
      optionalGroups.map(item => JSON.stringify({
        terms: item.terms,
        weight: item.weight
      }))
    ).map(item => JSON.parse(item)),
    basicTerms: unique(basicTerms),
    negativeTerms: unique(negativeTerms),
    positiveClauseCount,
    blockedKeywords: [...blockedKeywordsUsed]
  };
}

function scoreSearchText(text, parsedQuery) {
  const normalizedText = String(text || '').toLowerCase();
  if (!normalizedText.trim()) {
    return { score: 0, matchedKeywords: [] };
  }

  for (const term of parsedQuery.negativeTerms || []) {
    if (normalizedText.includes(term)) {
      return { score: 0, matchedKeywords: [], blockedBy: term };
    }
  }

  const matchedKeywords = new Set();
  let score = 0;
  let syntaxMatchCount = 0;
  let basicTermMatchCount = 0;

  for (const phrase of parsedQuery.phrases || []) {
    const occurrences = countOccurrences(normalizedText, phrase);
    if (occurrences > 0) {
      matchedKeywords.add(phrase);
      score += 4 + Math.min(occurrences - 1, 2) * 0.5;
      syntaxMatchCount += 1;
    }
  }

  for (const weighted of parsedQuery.weightedTerms || []) {
    const occurrences = countOccurrences(normalizedText, weighted.term);
    if (occurrences > 0) {
      matchedKeywords.add(weighted.term);
      score += (2.2 * weighted.weight) + Math.min(occurrences - 1, 2) * 0.35 * weighted.weight;
      syntaxMatchCount += 1;
    }
  }

  for (const group of parsedQuery.optionalGroups || []) {
    const matched = group.terms.filter(term => normalizedText.includes(term));
    if (matched.length > 0) {
      matched.forEach(term => matchedKeywords.add(term));
      score += group.weight * (1.35 + (matched.length - 1) * 0.4);
      syntaxMatchCount += 1;
    }
  }

  for (const term of parsedQuery.basicTerms || []) {
    const occurrences = countOccurrences(normalizedText, term);
    if (occurrences > 0) {
      matchedKeywords.add(term);
      score += 1 + Math.min(occurrences - 1, 2) * 0.15;
      basicTermMatchCount += 1;
    }
  }

  const matchedClauseCount = Math.min(
    parsedQuery.positiveClauseCount || 0,
    syntaxMatchCount + (basicTermMatchCount > 0 ? 1 : 0)
  );

  if (matchedClauseCount > 1) {
    score += matchedClauseCount * 0.3;
  }
  if ((parsedQuery.positiveClauseCount || 0) > 1 && matchedClauseCount === parsedQuery.positiveClauseCount) {
    score += 0.45;
  }

  return {
    score: Number.parseFloat(score.toFixed(6)),
    matchedKeywords: [...matchedKeywords],
    matchedClauseCount
  };
}

function compareTopics(leftTopics = [], rightTopics = []) {
  if (leftTopics.length !== rightTopics.length) return false;
  for (let index = 0; index < leftTopics.length; index += 1) {
    const left = leftTopics[index];
    const right = rightTopics[index];
    if (!left || !right) return false;
    if (left.id !== right.id) return false;
    if (left.name !== right.name) return false;
    if (left.createdAt !== right.createdAt) return false;
    if (!!left.locked !== !!right.locked) return false;
  }
  return true;
}

function compareMessages(leftMessages = [], rightMessages = []) {
  if (leftMessages.length !== rightMessages.length) return false;
  for (let index = 0; index < leftMessages.length; index += 1) {
    const left = leftMessages[index];
    const right = rightMessages[index];
    if (!left || !right) return false;
    if (left.index !== right.index) return false;
    if (left.role !== right.role) return false;
    if (left.content !== right.content) return false;
    if (left.cleanContent !== right.cleanContent) return false;
    if (left.createdAt !== right.createdAt) return false;
  }
  return true;
}

function compareAgents(left, right) {
  if (!left || !right) return false;
  return left.agentId === right.agentId
    && left.maidName === right.maidName
    && left.source === right.source
    && left.sourceConfigPath === right.sourceConfigPath
    && left.sourceConfigMtime === right.sourceConfigMtime
    && left.sourceTopicRoot === right.sourceTopicRoot
    && compareTopics(left.topics || [], right.topics || []);
}

function compareConversations(left, right) {
  if (!left || !right) return false;
  return left.conversationId === right.conversationId
    && left.agentId === right.agentId
    && left.maidName === right.maidName
    && left.userName === right.userName
    && left.topicId === right.topicId
    && left.topicName === right.topicName
    && left.sourceFile === right.sourceFile
    && left.sourceMtime === right.sourceMtime
    && left.createdAt === right.createdAt
    && left.updatedAt === right.updatedAt
    && !!left.locked === !!right.locked
    && compareMessages(left.messages || [], right.messages || []);
}

function buildConversationId(agentId, topicId) {
  return `${agentId}:${topicId}`;
}

class ChatHistoryIndexStore {
  constructor(config) {
    this.config = config;
    this.loaded = false;
    this.syncPromise = null;
    this.lastSyncCheckedAtMs = 0;
    this.lastSyncRootPath = null;
    this.lastSyncReport = null;
    this.state = {
      version: 3,
      updatedAt: null,
      importedAt: null,
      importedFrom: null,
      agents: [],
      conversations: []
    };
  }

  async ensureReady() {
    if (this.loaded) return;
    await fs.mkdir(path.dirname(this.config.chatIndexPath), { recursive: true });

    try {
      const raw = await fs.readFile(this.config.chatIndexPath, 'utf8');
      this.state = this.normalizeState(JSON.parse(raw));
    } catch {
      await this.flush();
    }

    this.loaded = true;
  }

  async flush() {
    this.state.updatedAt = new Date().toISOString();
    await fs.writeFile(this.config.chatIndexPath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  normalizeState(rawState = {}) {
    const state = rawState && typeof rawState === 'object' ? rawState : {};
    const normalizedAgents = Array.isArray(state.agents)
      ? state.agents
          .map(agent => this.normalizeAgent(agent))
          .filter(Boolean)
      : [];
    const normalizedConversations = Array.isArray(state.conversations)
      ? state.conversations
          .map(conversation => this.normalizeConversation(conversation))
          .filter(Boolean)
      : [];

    return {
      version: 3,
      updatedAt: normalizeIsoTimestamp(state.updatedAt, null),
      importedAt: normalizeIsoTimestamp(state.importedAt, null),
      importedFrom: typeof state.importedFrom === 'string' && state.importedFrom.trim()
        ? path.normalize(state.importedFrom.trim())
        : null,
      agents: normalizedAgents,
      conversations: normalizedConversations
    };
  }

  normalizeAgent(agent = {}) {
    const agentId = String(agent.agentId || agent.uuid || '').trim();
    if (!agentId) return null;

    return {
      agentId,
      maidName: String(agent.maidName || agent.name || '').trim() || agentId,
      topics: unique((agent.topics || []).map(topic => JSON.stringify(normalizeTopic(topic))))
        .map(item => JSON.parse(item))
        .filter(topic => topic.id),
      updatedAt: normalizeIsoTimestamp(agent.updatedAt, new Date().toISOString()),
      source: String(agent.source || 'manual').trim(),
      sourceConfigPath: normalizePathValue(agent.sourceConfigPath),
      sourceConfigMtime: normalizeIsoTimestamp(agent.sourceConfigMtime, null),
      sourceTopicRoot: normalizePathValue(agent.sourceTopicRoot)
    };
  }

  normalizeConversation(conversation = {}) {
    const agentId = String(conversation.agentId || '').trim();
    const topicId = String(conversation.topicId || '').trim();
    const conversationId = String(
      conversation.conversationId || (agentId && topicId ? buildConversationId(agentId, topicId) : '')
    ).trim();
    if (!conversationId) return null;

    const messages = Array.isArray(conversation.messages)
      ? conversation.messages
          .map((message, index) => normalizeMessage(message, Number.isFinite(message?.index) ? message.index : index))
          .filter(Boolean)
      : [];

    return {
      conversationId,
      agentId,
      maidName: String(conversation.maidName || conversation.name || '').trim() || agentId || 'Unknown',
      userName: String(conversation.userName || '').trim() || '主人',
      topicId,
      topicName: String(conversation.topicName || topicId || conversationId).trim(),
      sourceFile: normalizePathValue(conversation.sourceFile),
      sourceMtime: normalizeIsoTimestamp(conversation.sourceMtime, null),
      createdAt: normalizeIsoTimestamp(conversation.createdAt, null),
      updatedAt: normalizeIsoTimestamp(conversation.updatedAt, conversation.createdAt || new Date().toISOString()),
      locked: !!conversation.locked,
      messages
    };
  }

  async upsertAgent(agent) {
    await this.ensureReady();
    const normalized = this.normalizeAgent(agent);
    if (!normalized) return null;

    const index = this.state.agents.findIndex(item => item.agentId === normalized.agentId);
    if (index >= 0) {
      this.state.agents[index] = normalized;
    } else {
      this.state.agents.push(normalized);
    }

    await this.flush();
    return normalized;
  }

  async upsertConversation(conversation) {
    await this.ensureReady();
    const normalized = this.normalizeConversation(conversation);
    if (!normalized) return null;

    const index = this.state.conversations.findIndex(item => item.conversationId === normalized.conversationId);
    if (index >= 0) {
      this.state.conversations[index] = normalized;
    } else {
      this.state.conversations.push(normalized);
    }

    await this.flush();
    return normalized;
  }

  getAgentMatcher({ maidName = '', agentId = '' } = {}) {
    const normalizedMaidName = String(maidName || '').trim().toLowerCase();
    const normalizedAgentId = String(agentId || '').trim();

    return (candidate = {}) => {
      if (normalizedAgentId && candidate.agentId !== normalizedAgentId) {
        return false;
      }
      if (normalizedMaidName && !String(candidate.maidName || '').toLowerCase().includes(normalizedMaidName)) {
        return false;
      }
      return true;
    };
  }

  findAgent(filters = {}) {
    const matchesAgent = this.getAgentMatcher(filters);
    return this.state.agents.find(agent => matchesAgent(agent)) || null;
  }

  buildAgentSummary(agent = null) {
    if (!agent) return null;
    return {
      agentId: agent.agentId,
      maidName: agent.maidName,
      topicCount: Array.isArray(agent.topics) ? agent.topics.length : 0,
      updatedAt: agent.updatedAt || null,
      sourceTopicRoot: agent.sourceTopicRoot || null,
      sourceConfigPath: agent.sourceConfigPath || null
    };
  }

  getAgentUserName(agentId = '') {
    return this.state.conversations.find(conversation => conversation.agentId === agentId)?.userName || '主人';
  }

  buildTopicConversationSnapshot({
    agent,
    topic,
    historyPath = null,
    historyStats = null,
    messages = [],
    userName = 'User'
  } = {}) {
    return this.normalizeConversation({
      conversationId: buildConversationId(agent.agentId, topic.id),
      agentId: agent.agentId,
      maidName: agent.maidName,
      userName,
      topicId: topic.id,
      topicName: topic.name || topic.id,
      sourceFile: historyPath,
      sourceMtime: normalizeIsoTimestamp(historyStats?.mtime, null),
      createdAt: topic.createdAt || normalizeIsoTimestamp(historyStats?.birthtime, null) || null,
      updatedAt: normalizeIsoTimestamp(historyStats?.mtime, topic.createdAt || null),
      locked: !!topic.locked,
      messages
    });
  }

  async getAgent(filters = {}) {
    await this.ensureReady();
    return this.buildAgentSummary(this.findAgent(filters));
  }

  async inspectTopic({ topicId, maidName = '', agentId = '', includeMessages = true } = {}) {
    await this.ensureReady();
    const normalizedTopicId = String(topicId || '').trim();
    if (!normalizedTopicId) {
      return {
        agent: null,
        topic: null,
        topicStatus: 'topic-id-missing',
        errorMessage: null
      };
    }

    const agent = this.findAgent({ maidName, agentId });
    const agentSummary = this.buildAgentSummary(agent);
    if (!agent) {
      return {
        agent: null,
        topic: null,
        topicStatus: 'agent-not-found',
        errorMessage: null
      };
    }

    const topicMetadata = agent.topics.find(topic => topic.id === normalizedTopicId) || null;
    if (!topicMetadata) {
      return {
        agent: agentSummary,
        topic: null,
        topicStatus: 'topic-not-found',
        errorMessage: null
      };
    }

    const conversation = this.state.conversations.find(candidate => {
      return candidate.agentId === agent.agentId && candidate.topicId === normalizedTopicId;
    });

    if (conversation) {
      return {
        agent: agentSummary,
        topic: buildTopicPayloadFromConversation(conversation, includeMessages),
        topicStatus: conversation.messages.length > 0 ? 'ready' : 'empty-history',
        errorMessage: null
      };
    }

    const historyPath = agent.sourceTopicRoot
      ? path.join(agent.sourceTopicRoot, normalizedTopicId, 'history.json')
      : null;
    const userName = this.getAgentUserName(agent.agentId);

    if (!historyPath) {
      const fallbackConversation = this.buildTopicConversationSnapshot({
        agent,
        topic: topicMetadata,
        messages: [],
        userName
      });
      return {
        agent: agentSummary,
        topic: buildTopicPayloadFromConversation(fallbackConversation, includeMessages),
        topicStatus: 'missing-history',
        errorMessage: null
      };
    }

    try {
      const historyStats = await fs.stat(historyPath);
      const rawHistory = await this.readJsonFile(historyPath);
      const history = Array.isArray(rawHistory)
        ? rawHistory
        : (rawHistory && Array.isArray(rawHistory.messages) ? rawHistory.messages : []);
      const conversationFromDisk = this.buildTopicConversationSnapshot({
        agent,
        topic: topicMetadata,
        historyPath,
        historyStats,
        messages: history,
        userName
      });
      return {
        agent: agentSummary,
        topic: buildTopicPayloadFromConversation(conversationFromDisk, includeMessages),
        topicStatus: conversationFromDisk.messages.length > 0 ? 'ready' : 'empty-history',
        errorMessage: null
      };
    } catch (error) {
      const fallbackConversation = this.buildTopicConversationSnapshot({
        agent,
        topic: topicMetadata,
        historyPath,
        messages: [],
        userName
      });
      return {
        agent: agentSummary,
        topic: buildTopicPayloadFromConversation(fallbackConversation, includeMessages),
        topicStatus: error?.code === 'ENOENT' ? 'missing-history' : 'history-read-error',
        errorMessage: error?.message || null
      };
    }
  }

  getConversationMetadata({ agentId, maidName, userName, topic, historyPath, historyStats, existingConversation = null }) {
    const historyMtime = normalizeIsoTimestamp(historyStats?.mtime, existingConversation?.sourceMtime || null);
    const createdAt = topic.createdAt
      || existingConversation?.createdAt
      || normalizeIsoTimestamp(historyStats?.birthtime, null)
      || historyMtime;

    return {
      conversationId: buildConversationId(agentId, topic.id),
      agentId,
      maidName,
      userName,
      topicId: topic.id,
      topicName: topic.name || topic.id,
      sourceFile: historyPath,
      sourceMtime: historyMtime,
      createdAt,
      updatedAt: historyMtime || createdAt || new Date().toISOString(),
      locked: !!topic.locked
    };
  }

  async readJsonFile(filePath) {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  }

  async listDirectoryEntries(directoryPath) {
    try {
      return await fs.readdir(directoryPath, { withFileTypes: true });
    } catch {
      return [];
    }
  }

  buildTopicMap(rawTopics = [], topicDirectoryEntries = []) {
    const knownTopics = new Map(rawTopics.map(topic => [topic.id, topic]));
    for (const topicEntry of topicDirectoryEntries) {
      if (!topicEntry.isDirectory()) continue;
      if (!knownTopics.has(topicEntry.name)) {
        knownTopics.set(topicEntry.name, normalizeTopic({ id: topicEntry.name, name: topicEntry.name }));
      }
    }
    return knownTopics;
  }

  async buildConversationFromHistory({ metadata, historyPath, existingConversation = null }) {
    try {
      const rawHistory = await this.readJsonFile(historyPath);
      const history = Array.isArray(rawHistory)
        ? rawHistory
        : (rawHistory && Array.isArray(rawHistory.messages) ? rawHistory.messages : []);
      return this.normalizeConversation({
        ...metadata,
        messages: history
      });
    } catch {
      if (!existingConversation) return null;
      return this.normalizeConversation({
        ...existingConversation,
        ...metadata,
        messages: existingConversation.messages || []
      });
    }
  }

  shouldRefreshConversation(existingConversation, metadata) {
    if (!existingConversation) return { content: true, metadata: true };

    const contentChanged = existingConversation.sourceFile !== metadata.sourceFile
      || existingConversation.sourceMtime !== metadata.sourceMtime;

    const metadataChanged = existingConversation.maidName !== metadata.maidName
      || existingConversation.userName !== metadata.userName
      || existingConversation.topicName !== metadata.topicName
      || existingConversation.createdAt !== metadata.createdAt
      || existingConversation.updatedAt !== metadata.updatedAt
      || !!existingConversation.locked !== !!metadata.locked;

    return {
      content: contentChanged,
      metadata: metadataChanged
    };
  }

  async performSyncFromVchat({ rootPath, force = false }) {
    const resolvedRoot = typeof rootPath === 'string' && rootPath.trim()
      ? path.resolve(rootPath)
      : '';

    if (!resolvedRoot) {
      throw new Error('Active memory root path is required for syncFromVchat.');
    }

    const settingsPath = path.join(resolvedRoot, 'settings.json');
    const agentsDir = path.join(resolvedRoot, 'Agents');
    const userDataDir = path.join(resolvedRoot, 'UserData');
    const previousAgents = new Map(this.state.agents.map(agent => [agent.agentId, agent]));
    const previousConversations = new Map(this.state.conversations.map(conversation => [conversation.conversationId, conversation]));
    const nowIso = new Date().toISOString();

    let userName = '主人';
    try {
      const parsedSettings = await this.readJsonFile(settingsPath);
      userName = String(parsedSettings.userName || userName).trim() || userName;
    } catch {
      userName = '主人';
    }

    let agentEntries;
    try {
      agentEntries = await fs.readdir(agentsDir, { withFileTypes: true });
    } catch (error) {
      throw new Error(`Failed to scan active memory root: ${error.message}`);
    }

    const nextAgents = [];
    const nextConversations = [];
    const nextAgentIds = new Set();
    const nextConversationIds = new Set();
    const stats = {
      scannedAgentCount: 0,
      scannedTopicCount: 0,
      addedAgentCount: 0,
      updatedAgentCount: 0,
      removedAgentCount: 0,
      skippedAgentCount: 0,
      addedConversationCount: 0,
      updatedConversationCount: 0,
      removedConversationCount: 0,
      reusedConversationCount: 0,
      skippedConversationCount: 0
    };

    for (const entry of agentEntries) {
      if (!entry.isDirectory()) continue;
      stats.scannedAgentCount += 1;
      const agentId = entry.name;
      const existingAgent = previousAgents.get(agentId) || null;
      const configPath = path.join(agentsDir, agentId, 'config.json');
      const topicRoot = path.join(userDataDir, agentId, 'topics');
      const configStats = await fs.stat(configPath).catch(() => null);

      let config = null;
      if (configStats) {
        try {
          config = await this.readJsonFile(configPath);
        } catch {
          config = null;
        }
      }

      if (!config && !existingAgent) {
        stats.skippedAgentCount += 1;
        continue;
      }

      if (!config && existingAgent) {
        nextAgents.push(existingAgent);
        nextAgentIds.add(existingAgent.agentId);
        stats.skippedAgentCount += 1;
        for (const existingConversation of this.state.conversations.filter(candidate => candidate.agentId === existingAgent.agentId)) {
          nextConversations.push(existingConversation);
          nextConversationIds.add(existingConversation.conversationId);
          stats.reusedConversationCount += 1;
        }
        continue;
      }

      const maidName = String(config.name || existingAgent?.maidName || agentId).trim() || agentId;
      const rawTopics = Array.isArray(config.topics)
        ? config.topics.map(normalizeTopic).filter(topic => topic.id)
        : (existingAgent?.topics || []);
      const topicDirectoryEntries = await this.listDirectoryEntries(topicRoot);
      const knownTopics = this.buildTopicMap(rawTopics, topicDirectoryEntries);
      const nextAgent = this.normalizeAgent({
        agentId,
        maidName,
        topics: [...knownTopics.values()],
        updatedAt: nowIso,
        source: 'vchat',
        sourceConfigPath: configPath,
        sourceConfigMtime: normalizeIsoTimestamp(configStats?.mtime, existingAgent?.sourceConfigMtime || null),
        sourceTopicRoot: topicRoot
      });

      nextAgents.push(nextAgent);
      nextAgentIds.add(nextAgent.agentId);
      if (!existingAgent) {
        stats.addedAgentCount += 1;
      } else if (!compareAgents(existingAgent, nextAgent)) {
        stats.updatedAgentCount += 1;
      }

      for (const topic of knownTopics.values()) {
        stats.scannedTopicCount += 1;
        const conversationId = buildConversationId(agentId, topic.id);
        const existingConversation = previousConversations.get(conversationId) || null;
        const historyPath = path.join(topicRoot, topic.id, 'history.json');
        const historyStats = await fs.stat(historyPath).catch(() => null);

        if (!historyStats) {
          continue;
        }

        const metadata = this.getConversationMetadata({
          agentId,
          maidName,
          userName,
          topic,
          historyPath,
          historyStats,
          existingConversation
        });
        const refresh = this.shouldRefreshConversation(existingConversation, metadata);
        let nextConversation = existingConversation;

        if (force || refresh.content) {
          nextConversation = await this.buildConversationFromHistory({
            metadata,
            historyPath,
            existingConversation
          });
          if (!nextConversation) {
            stats.skippedConversationCount += 1;
            continue;
          }
        } else if (refresh.metadata) {
          nextConversation = this.normalizeConversation({
            ...existingConversation,
            ...metadata,
            messages: existingConversation?.messages || []
          });
        } else {
          stats.reusedConversationCount += 1;
        }

        nextConversations.push(nextConversation);
        nextConversationIds.add(nextConversation.conversationId);

        if (!existingConversation) {
          stats.addedConversationCount += 1;
        } else if (!compareConversations(existingConversation, nextConversation)) {
          stats.updatedConversationCount += 1;
        }
      }
    }

    stats.removedAgentCount = [...previousAgents.keys()].filter(agentId => !nextAgentIds.has(agentId)).length;
    stats.removedConversationCount = [...previousConversations.keys()].filter(conversationId => !nextConversationIds.has(conversationId)).length;

    const changed = force
      || stats.addedAgentCount > 0
      || stats.updatedAgentCount > 0
      || stats.removedAgentCount > 0
      || stats.addedConversationCount > 0
      || stats.updatedConversationCount > 0
      || stats.removedConversationCount > 0
      || this.state.importedFrom !== resolvedRoot
      || !this.state.importedAt;

    if (changed) {
      this.state.agents = nextAgents;
      this.state.conversations = nextConversations;
      this.state.importedAt = nowIso;
      this.state.importedFrom = resolvedRoot;
      await this.flush();
    }

    const topicCount = this.state.agents.reduce((sum, agent) => sum + agent.topics.length, 0);
    const messageCount = this.state.conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0);

    return {
      mode: force ? 'rebuild' : 'incremental',
      changed,
      rootPath: resolvedRoot,
      agentCount: this.state.agents.length,
      topicCount,
      conversationCount: this.state.conversations.length,
      messageCount,
      ...stats
    };
  }

  async syncFromVchat({
    rootPath = this.config.activeMemoryRootPath,
    force = false,
    respectMinInterval = true
  } = {}) {
    await this.ensureReady();
    const resolvedRoot = typeof rootPath === 'string' && rootPath.trim()
      ? path.resolve(rootPath)
      : '';

    if (!resolvedRoot) {
      throw new Error('Active memory root path is required for syncFromVchat.');
    }

    this.config.activeMemoryRootPath = resolvedRoot;

    const minIntervalMs = Math.max(
      0,
      Number.parseInt(String(this.config.activeMemorySyncMinIntervalMs ?? 0), 10) || 0
    );
    const now = Date.now();

    if (
      !force
      && respectMinInterval
      && this.lastSyncRootPath === resolvedRoot
      && minIntervalMs > 0
      && now - this.lastSyncCheckedAtMs < minIntervalMs
    ) {
      const checkedAt = new Date().toISOString();
      this.lastSyncReport = {
        mode: 'incremental',
        changed: false,
        skipped: true,
        reason: 'cooldown',
        checkedAt,
        rootPath: resolvedRoot
      };
      return {
        mode: 'incremental',
        changed: false,
        skipped: true,
        reason: 'cooldown',
        rootPath: resolvedRoot,
        agentCount: this.state.agents.length,
        topicCount: this.state.agents.reduce((sum, agent) => sum + agent.topics.length, 0),
        conversationCount: this.state.conversations.length,
        messageCount: this.state.conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0),
        scannedAgentCount: 0,
        scannedTopicCount: 0,
        addedAgentCount: 0,
        updatedAgentCount: 0,
        removedAgentCount: 0,
        skippedAgentCount: 0,
        addedConversationCount: 0,
        updatedConversationCount: 0,
        removedConversationCount: 0,
        reusedConversationCount: 0,
        skippedConversationCount: 0
      };
    }

    if (!this.syncPromise) {
      this.syncPromise = this.performSyncFromVchat({
        rootPath: resolvedRoot,
        force
      }).finally(() => {
        this.syncPromise = null;
      });
    }

    const result = await this.syncPromise;
    this.lastSyncCheckedAtMs = Date.now();
    this.lastSyncRootPath = resolvedRoot;
    this.lastSyncReport = {
      mode: result.mode,
      changed: result.changed,
      skipped: false,
      reason: null,
      checkedAt: new Date(this.lastSyncCheckedAtMs).toISOString(),
      rootPath: resolvedRoot
    };
    return result;
  }

  async rebuildFromVchat(rootPath = this.config.activeMemoryRootPath) {
    return this.syncFromVchat({
      rootPath,
      force: true,
      respectMinInterval: false
    });
  }

  async listTopics(filters = {}) {
    await this.ensureReady();
    const matchesAgent = this.getAgentMatcher(filters);
    const topics = [];

    for (const agent of this.state.agents) {
      if (!matchesAgent(agent)) continue;
      const conversationByTopic = new Map(
        this.state.conversations
          .filter(conversation => conversation.agentId === agent.agentId && conversation.topicId)
          .map(conversation => [conversation.topicId, conversation])
      );

      for (const topic of agent.topics) {
        const conversation = conversationByTopic.get(topic.id);
        topics.push({
          agentId: agent.agentId,
          maidName: agent.maidName,
          topicId: topic.id,
          topicName: topic.name,
          createdAt: topic.createdAt || conversation?.createdAt || null,
          updatedAt: conversation?.updatedAt || topic.createdAt || null,
          locked: !!topic.locked,
          messageCount: conversation?.messages?.length || 0,
          sourceFile: conversation?.sourceFile || null
        });
      }
    }
    return topics;
  }

  async getTopicContent({ topicId, maidName = '', agentId = '', includeMessages = true } = {}) {
    const inspection = await this.inspectTopic({
      topicId,
      maidName,
      agentId,
      includeMessages
    });
    return inspection.topic;
  }

  async search({
    query,
    limit = 5,
    maidName = '',
    agentId = '',
    topicId = '',
    currentTopicId = '',
    windowSize = 3,
    includeContent = true,
    excludeLatestTopic = true,
    blockedKeywords = this.config.activeMemoryBlockedKeywords || []
  } = {}) {
    await this.ensureReady();
    const parsedQuery = filterDeepMemoQuery(parseDeepMemoQuery(query), blockedKeywords);
    const hasPositiveTerms = (parsedQuery.phrases?.length || 0) > 0
      || (parsedQuery.weightedTerms?.length || 0) > 0
      || (parsedQuery.optionalGroups?.length || 0) > 0
      || (parsedQuery.basicTerms?.length || 0) > 0;
    if (!hasPositiveTerms) {
      return [];
    }
    const safeLimit = Math.max(1, Math.min(Number.parseInt(String(limit || ''), 10) || 5, 20));
    const safeWindow = Math.max(0, Math.min(Number.parseInt(String(windowSize || ''), 10) || 3, 20));
    const matchesAgent = this.getAgentMatcher({ maidName, agentId });
    const normalizedTopicId = String(topicId || '').trim();
    const normalizedCurrentTopicId = String(currentTopicId || '').trim();
    const results = [];
    const scopedConversations = this.state.conversations
      .filter(conversation => {
        if (!matchesAgent(conversation)) return false;
        if (normalizedTopicId && conversation.topicId !== normalizedTopicId) return false;
        return true;
      })
      .sort((left, right) => {
        return toTimestampNumber(right.updatedAt || right.createdAt) - toTimestampNumber(left.updatedAt || left.createdAt);
      });
    const excludedTopicIds = new Set();

    if (!normalizedTopicId && excludeLatestTopic) {
      const latestByAgent = new Map();
      for (const conversation of scopedConversations) {
        const currentLatest = latestByAgent.get(conversation.agentId);
        if (!currentLatest) {
          latestByAgent.set(conversation.agentId, conversation);
          continue;
        }

        const currentTime = toTimestampNumber(conversation.updatedAt || conversation.createdAt);
        const latestTime = toTimestampNumber(currentLatest.updatedAt || currentLatest.createdAt);
        if (currentTime > latestTime) {
          latestByAgent.set(conversation.agentId, conversation);
        }
      }

      for (const conversation of latestByAgent.values()) {
        if (conversation.topicId) {
          excludedTopicIds.add(conversation.topicId);
        }
      }
    }

    if (normalizedCurrentTopicId) {
      excludedTopicIds.add(normalizedCurrentTopicId);
    }

    for (const conversation of scopedConversations) {
      if (conversation.topicId && excludedTopicIds.has(conversation.topicId)) continue;

      const rankedHits = [];
      for (let index = 0; index < conversation.messages.length; index += 1) {
        const message = conversation.messages[index];
        const hitScore = scoreSearchText(message.cleanContent, parsedQuery);
        if (hitScore.score <= 0) continue;

        const start = Math.max(0, index - safeWindow);
        const end = Math.min(conversation.messages.length, index + safeWindow + 1);
        const windowMessages = conversation.messages.slice(start, end);
        const formattedWindow = formatMessageWindow(windowMessages, conversation.userName, conversation.maidName);
        const windowScore = scoreSearchText(formattedWindow, parsedQuery);

        rankedHits.push({
          messageIndex: index,
          start,
          end,
          score: Number.parseFloat((hitScore.score + windowScore.score * 0.35).toFixed(6)),
          matchedKeywords: unique([...(hitScore.matchedKeywords || []), ...(windowScore.matchedKeywords || [])]),
          keywordMatchCount: unique([...(hitScore.matchedKeywords || []), ...(windowScore.matchedKeywords || [])]).length,
          matchedClauseCount: Math.max(hitScore.matchedClauseCount || 0, windowScore.matchedClauseCount || 0),
          formattedWindow,
          snippet: truncateText(formattedWindow, 260)
        });
      }

      rankedHits.sort((left, right) => {
        if (right.matchedClauseCount !== left.matchedClauseCount) {
          return right.matchedClauseCount - left.matchedClauseCount;
        }
        if (right.keywordMatchCount !== left.keywordMatchCount) {
          return right.keywordMatchCount - left.keywordMatchCount;
        }
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        return right.messageIndex - left.messageIndex;
      });
      const coveredRanges = [];

      for (const hit of rankedHits) {
        const overlapsExisting = coveredRanges.some(range => hit.messageIndex >= range.start && hit.messageIndex < range.end);
        if (overlapsExisting) continue;
        coveredRanges.push({ start: hit.start, end: hit.end });

        results.push({
          target: 'chat',
          recallType: 'deepmemo',
          conversationId: conversation.conversationId,
          agentId: conversation.agentId,
          maidName: conversation.maidName,
          userName: conversation.userName,
          topicId: conversation.topicId,
          topicName: conversation.topicName,
          sourceFile: conversation.sourceFile,
          score: hit.score,
          matchedKeywords: hit.matchedKeywords,
          keywordMatchCount: hit.keywordMatchCount,
          matchedClauseCount: hit.matchedClauseCount,
          hitMessageIndex: hit.messageIndex,
          windowStart: hit.start,
          windowEndExclusive: hit.end,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          snippet: hit.snippet,
          content: includeContent ? hit.formattedWindow : undefined
        });
      }
    }

    results.sort((left, right) => {
      if ((right.matchedClauseCount || 0) !== (left.matchedClauseCount || 0)) {
        return (right.matchedClauseCount || 0) - (left.matchedClauseCount || 0);
      }
      if ((right.keywordMatchCount || 0) !== (left.keywordMatchCount || 0)) {
        return (right.keywordMatchCount || 0) - (left.keywordMatchCount || 0);
      }
      if ((right.score || 0) !== (left.score || 0)) {
        return (right.score || 0) - (left.score || 0);
      }

      const sameTopic = String(left.topicId || '') === String(right.topicId || '');
      if (sameTopic) {
        if ((right.hitMessageIndex || 0) !== (left.hitMessageIndex || 0)) {
          return (right.hitMessageIndex || 0) - (left.hitMessageIndex || 0);
        }
      }

      if (!sameTopic) {
        const leftWindowSpan = getWindowSpan(left.windowStart, left.windowEndExclusive);
        const rightWindowSpan = getWindowSpan(right.windowStart, right.windowEndExclusive);
        if (leftWindowSpan !== rightWindowSpan) {
          return leftWindowSpan - rightWindowSpan;
        }
      }

      const rightUpdatedAt = toTimestampNumber(right.updatedAt || right.createdAt);
      const leftUpdatedAt = toTimestampNumber(left.updatedAt || left.createdAt);
      if (rightUpdatedAt !== leftUpdatedAt) {
        return rightUpdatedAt - leftUpdatedAt;
      }

      if ((right.hitMessageIndex || 0) !== (left.hitMessageIndex || 0)) {
        return (right.hitMessageIndex || 0) - (left.hitMessageIndex || 0);
      }

      return String(left.topicId || '').localeCompare(String(right.topicId || ''));
    });

    return results.slice(0, safeLimit);
  }

  async getHealth() {
    await this.ensureReady();
    return {
      available: true,
      status: this.state.conversations.length > 0 ? 'indexed' : 'empty',
      importedAt: this.state.importedAt || null,
      importedFrom: this.state.importedFrom || null,
      lastSyncAt: this.lastSyncReport?.checkedAt || this.state.importedAt || null,
      lastSyncMode: this.lastSyncReport?.mode || null,
      lastSyncChanged: typeof this.lastSyncReport?.changed === 'boolean' ? this.lastSyncReport.changed : null,
      lastSyncReason: this.lastSyncReport?.reason || null,
      syncMinIntervalMs: Math.max(0, Number.parseInt(String(this.config.activeMemorySyncMinIntervalMs ?? 0), 10) || 0),
      agentCount: this.state.agents.length,
      topicCount: this.state.agents.reduce((sum, agent) => sum + agent.topics.length, 0),
      conversationCount: this.state.conversations.length,
      messageCount: this.state.conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0)
    };
  }
}

module.exports = {
  ChatHistoryIndexStore
};
