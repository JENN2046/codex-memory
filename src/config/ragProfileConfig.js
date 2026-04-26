const fs = require('node:fs');

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function mergePlainObjects(base = {}, override = {}) {
  const output = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (key === 'inherits') continue;
    output[key] = isPlainObject(value) && isPlainObject(output[key])
      ? mergePlainObjects(output[key], value)
      : value;
  }
  return output;
}

function normalizeRange(value, fallback, { min = -Infinity, max = Infinity } = {}) {
  if (!Array.isArray(value) || value.length !== 2) return fallback;
  const left = Number(value[0]);
  const right = Number(value[1]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return fallback;
  const low = Math.max(min, Math.min(max, Math.min(left, right)));
  const high = Math.max(min, Math.min(max, Math.max(left, right)));
  return [low, high];
}

function loadRagProfileConfig({ filePath, embeddingFingerprint } = {}) {
  if (!filePath) {
    return {
      available: false,
      selectedProfile: null,
      params: {}
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return {
      available: false,
      selectedProfile: null,
      params: {},
      error: error.message
    };
  }

  const defaultParams = isPlainObject(parsed.default) ? parsed.default : {};
  const profiles = isPlainObject(parsed.profiles) ? parsed.profiles : {};
  const profileParams = isPlainObject(profiles[embeddingFingerprint]) ? profiles[embeddingFingerprint] : {};

  return {
    available: true,
    selectedProfile: profileParams === profiles[embeddingFingerprint] ? embeddingFingerprint : 'default',
    params: mergePlainObjects(defaultParams, profileParams)
  };
}

function applyRagProfileToConfig(config, ragProfile = {}) {
  const params = ragProfile.params || {};
  const ragDiary = params.RAGDiaryPlugin || {};
  const knowledgeBase = params.KnowledgeBaseManager || {};
  const metaThinking = params.MetaThinkingManager || {};

  return {
    ...config,
    ragProfile: {
      available: !!ragProfile.available,
      selectedProfile: ragProfile.selectedProfile || null,
      error: ragProfile.error || null,
      params
    },
    tagMemoDynamicWeightRange: normalizeRange(
      ragDiary.tagWeightRange,
      config.tagMemoDynamicWeightRange,
      { min: 0, max: 1 }
    ),
    tagMemoCoreBoostRange: normalizeRange(
      knowledgeBase.coreBoostRange,
      config.tagMemoCoreBoostRange,
      { min: 1, max: 3 }
    ),
    geodesicRerank: {
      ...(config.geodesicRerank || {}),
      ...(isPlainObject(knowledgeBase.geodesicRerank) ? knowledgeBase.geodesicRerank : {})
    },
    metaThinkingAutoThreshold: Number.isFinite(Number(metaThinking.autoThreshold))
      ? Number(metaThinking.autoThreshold)
      : config.metaThinkingAutoThreshold
  };
}

module.exports = {
  applyRagProfileToConfig,
  loadRagProfileConfig,
  mergePlainObjects,
  normalizeRange
};
