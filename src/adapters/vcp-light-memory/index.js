const { LightMemoDirectoryPolicy } = require('./DirectoryPolicy');

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return undefined;
}

function normalizeInteger(value, fallback, min = 1, max = 50) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeFloat(value, fallback, min = 0, max = 5) {
  const parsed = Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function toLowerCaseText(value) {
  return String(value || '').toLowerCase();
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function normalizeRerank(raw) {
  if (raw === undefined || raw === null || raw === false) {
    return { enabled: false, alpha: null };
  }

  if (raw === true) {
    return { enabled: true, alpha: null };
  }

  if (typeof raw === 'number') {
    const alpha = Math.max(0, Math.min(1, raw));
    return { enabled: true, alpha };
  }

  const normalized = String(raw).trim().toLowerCase();
  if (!normalized) return { enabled: false, alpha: null };
  if (normalized === 'true') return { enabled: true, alpha: null };
  if (normalized === 'rrf') return { enabled: true, alpha: 0.5 };

  const rrfMatch = normalized.match(/^rrf(\d+(?:\.\d+)?)$/);
  if (rrfMatch) {
    return { enabled: true, alpha: Math.max(0, Math.min(1, Number.parseFloat(rrfMatch[1]))) };
  }

  const numeric = Number.parseFloat(normalized);
  if (Number.isFinite(numeric)) {
    return { enabled: true, alpha: Math.max(0, Math.min(1, numeric)) };
  }

  return { enabled: true, alpha: null };
}

function normalizeTagBoost(raw) {
  if (raw === undefined || raw === null || raw === false) {
    return { weight: null, geodesic: false };
  }

  if (raw === true) {
    return { weight: 1, geodesic: false };
  }

  const source = String(raw).trim();
  if (!source) {
    return { weight: null, geodesic: false };
  }

  if (source.endsWith('+')) {
    return {
      weight: normalizeFloat(source.slice(0, -1), 1, 0.2, 2.5),
      geodesic: true
    };
  }

  return {
    weight: normalizeFloat(source, 1, 0.2, 2.5),
    geodesic: false
  };
}

function normalizeCoreTags(raw) {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map(item => String(item || '').trim()).filter(Boolean))];
  }

  if (typeof raw === 'string') {
    return [...new Set(raw.split(/[,\s|]+/).map(item => item.trim()).filter(Boolean))];
  }

  return [];
}

function normalizeFolderFilters(raw) {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map(item => String(item || '').trim()).filter(Boolean))];
  }

  if (typeof raw === 'string') {
    return [...new Set(raw.split(/[,|]/).map(item => item.trim()).filter(Boolean))];
  }

  return [];
}

function extractTimeDirectiveFromQuery(query = '') {
  const source = String(query || '');
  let cleaned = source;
  let timeValue = '';
  const rangeMatch = source.match(/\[\s*(20\d{2}[-./]\d{1,2}(?:[-./]\d{1,2})?)\s*[~到]\s*(20\d{2}[-./]\d{1,2}(?:[-./]\d{1,2})?)\s*\]/);
  if (rangeMatch) {
    timeValue = `${rangeMatch[1]}~${rangeMatch[2]}`;
    cleaned = cleaned.replace(rangeMatch[0], ' ');
  } else {
    const singleMatch = source.match(/\[\s*(20\d{2}[-./]\d{1,2}(?:[-./]\d{1,2})?)\s*\]/);
    if (singleMatch) {
      timeValue = singleMatch[1];
      cleaned = cleaned.replace(singleMatch[0], ' ');
    }
  }

  return {
    query: cleaned.replace(/\s+/g, ' ').trim(),
    timeValue
  };
}

function buildCompatibilityQuery(input) {
  const queryTokens = [];
  if (input.query) queryTokens.push(input.query);
  queryTokens.push(...(input.coreTags || []));
  const queryText = queryTokens.join(' ').replace(/\s+/g, ' ').trim() || 'memory';
  const directives = [];

  if (input.timeValue) {
    directives.push(`::Time(${input.timeValue})`);
  }

  if (input.rerank.enabled) {
    if (input.rerank.alpha === null) {
      directives.push('::Rerank');
    } else {
      directives.push(`::Rerank+${Number(input.rerank.alpha.toFixed(3))}`);
    }
  }

  if (input.tagBoost.weight !== null) {
    if (input.tagBoost.geodesic) {
      directives.push(`::TagMemo+${Number(input.tagBoost.weight.toFixed(3))}`);
    } else {
      directives.push(`::TagMemo(${Number(input.tagBoost.weight.toFixed(3))})`);
    }
  }

  return `[[${queryText}]] ${directives.join(' ')}`.trim();
}

function createHaystack(result) {
  return [
    result.title || '',
    result.sourceFile || '',
    result.snippet || '',
    result.content || ''
  ].join('\n').toLowerCase();
}

function applyLightMemoFilters(results, filters) {
  if (!Array.isArray(results) || results.length === 0) return [];

  return results.filter(result => {
    const haystack = createHaystack(result);
    if (filters.maidName && !haystack.includes(filters.maidName.toLowerCase())) {
      return false;
    }

    return true;
  });
}

function formatLightMemoOutput(response) {
  const lines = [];
  lines.push('[--- LightMemo Recall ---]');
  lines.push(`[Query: "${response.query || ''}"]`);
  lines.push(`[Target: ${response.target}]`);
  lines.push(`[Results: ${response.results.length}]`);
  lines.push('');

  response.results.forEach((result, index) => {
    const score = Number.isFinite(result.score) ? `${(result.score * 100).toFixed(1)}%` : 'N/A';
    lines.push(`--- #${index + 1} (${result.target || 'unknown'}, score ${score})`);
    if (result.sourceFile) {
      lines.push(`Path: ${result.sourceFile}`);
    }
    if (result.matchedTags?.length) {
      lines.push(`Tags: ${result.matchedTags.join(', ')}`);
    }
    lines.push(result.content || result.snippet || '');
    lines.push('');
  });

  lines.push('[--- End ---]');
  return lines.join('\n').trim();
}

function normalizeSearchInput(rawInput, options = {}) {
  const merged = rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)
    ? { ...rawInput, ...options }
    : { ...options };

  const query = String(firstNonEmpty(
    merged.query,
    merged.keyword,
    merged.key_word,
    merged.KeyWord,
    typeof rawInput === 'string' ? rawInput : ''
  ) || '').trim();
  const timeInfo = extractTimeDirectiveFromQuery(query);

  return {
    query: timeInfo.query,
    timeValue: timeInfo.timeValue,
    maidName: String(firstNonEmpty(merged.maidName, merged.maid, '') || '').trim(),
    folders: normalizeFolderFilters(firstNonEmpty(merged.folder, merged.folders, '')),
    limit: normalizeInteger(firstNonEmpty(merged.limit, merged.k, merged.top_n), 5, 1, 20),
    includeContent: merged.includeContent ?? merged.include_content ?? true,
    searchAllKnowledgeBases: toBoolean(firstNonEmpty(merged.search_all_knowledge_bases, merged.searchAllKnowledgeBases), false),
    target: String(firstNonEmpty(merged.target, '') || '').trim().toLowerCase(),
    rerank: normalizeRerank(firstNonEmpty(merged.rerank, false)),
    tagBoost: normalizeTagBoost(firstNonEmpty(merged.tag_boost, merged.tagBoost, null)),
    coreTags: normalizeCoreTags(firstNonEmpty(merged.core_tags, merged.coreTags, [])),
    contextText: String(firstNonEmpty(merged.contextText, merged.context_text, '') || '')
  };
}

class VcpLightMemoryAdapter {
  constructor({ config = {}, passiveRecallService, vcpPassiveMemoryAdapter }) {
    this.passiveRecallService = passiveRecallService;
    this.vcpPassiveMemoryAdapter = vcpPassiveMemoryAdapter;
    this.directoryPolicy = new LightMemoDirectoryPolicy(config);
  }

  resolveTarget(input) {
    if (input.target === 'process' || input.target === 'knowledge' || input.target === 'both') {
      return input.target;
    }

    if (input.searchAllKnowledgeBases) {
      return 'both';
    }

    return 'knowledge';
  }

  async search(rawInput, options = {}) {
    const normalized = normalizeSearchInput(rawInput, options);
    const target = this.resolveTarget(normalized);
    const compatibilityQuery = buildCompatibilityQuery(normalized);
    const candidateFilters = this.directoryPolicy.buildCandidateFilters(normalized);
    const passiveResponse = await this.vcpPassiveMemoryAdapter.search(compatibilityQuery, {
      target,
      limit: normalized.limit,
      includeContent: normalized.includeContent,
      contextText: normalized.contextText,
      candidateFilters
    });
    const filteredResults = applyLightMemoFilters(
      passiveResponse.results,
      this.directoryPolicy.buildPostFilters(normalized)
    ).slice(0, normalized.limit);

    const response = {
      mode: 'lightmemo',
      query: normalized.query,
      target,
      compatibilityQuery,
      filters: {
        maidName: normalized.maidName,
        folders: normalized.folders,
        searchAllKnowledgeBases: normalized.searchAllKnowledgeBases
      },
      results: filteredResults
    };

    return {
      ...response,
      outputText: formatLightMemoOutput(response),
      legacyResult: formatLightMemoOutput(response)
    };
  }

  async execute(rawInput, options = {}) {
    return this.search(rawInput, options);
  }
}

module.exports = {
  VcpLightMemoryAdapter
};
