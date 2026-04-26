function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value
      .map(item => String(item || '').trim().toLowerCase())
      .filter(Boolean))];
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return [...new Set(value
    .split(/[,|，]/)
    .map(item => item.trim().toLowerCase())
    .filter(Boolean))];
}

function normalizeRule(rule, fallbackMode = 'any') {
  if (!rule) {
    return { any: [], all: [] };
  }

  if (typeof rule === 'string') {
    const value = rule.trim().toLowerCase();
    if (!value) return { any: [], all: [] };
    return fallbackMode === 'all'
      ? { any: [], all: [value] }
      : { any: [value], all: [] };
  }

  if (Array.isArray(rule)) {
    return {
      any: [],
      all: normalizeStringList(rule)
    };
  }

  if (typeof rule === 'object') {
    return {
      any: normalizeStringList(rule.any ?? rule.includes ?? rule.or ?? rule.folders),
      all: normalizeStringList(rule.all ?? rule.segments ?? rule.path ?? rule.and)
    };
  }

  return { any: [], all: [] };
}

function mergeUnique(...groups) {
  return [...new Set(groups.flat().filter(Boolean))];
}

class LightMemoDirectoryPolicy {
  constructor(config = {}) {
    this.excludedFolders = normalizeStringList(config.lightMemoExcludedFolders);
    this.directoryMap = config.lightMemoDirectoryMap && typeof config.lightMemoDirectoryMap === 'object'
      ? config.lightMemoDirectoryMap
      : {};
  }

  resolveRule(value, fallbackMode = 'any') {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return { any: [], all: [] };
    }

    if (this.directoryMap[normalized]) {
      return normalizeRule(this.directoryMap[normalized], fallbackMode);
    }

    return normalizeRule(normalized, fallbackMode);
  }

  buildCandidateFilters(input = {}) {
    const excludedFolders = [...this.excludedFolders];
    if (input.searchAllKnowledgeBases) {
      return {
        relativePathExcludes: excludedFolders
      };
    }

    const maidRule = input.maidName
      ? this.resolveRule(input.maidName, 'all')
      : { any: [], all: [] };
    const folderRules = (Array.isArray(input.folders) ? input.folders : [])
      .map(folder => this.resolveRule(folder, 'any'))
      .filter(rule => rule.any.length > 0 || rule.all.length > 0);

    const groups = folderRules.length > 0
      ? folderRules.map(rule => ({
        anyIncludes: mergeUnique(maidRule.any, rule.any),
        allIncludes: mergeUnique(maidRule.all, rule.all)
      }))
      : ((maidRule.any.length > 0 || maidRule.all.length > 0)
          ? [{
            anyIncludes: maidRule.any,
            allIncludes: maidRule.all
          }]
          : []);

    return {
      ...(groups.length > 0 ? { relativePathGroups: groups } : {}),
      ...(excludedFolders.length > 0 ? { relativePathExcludes: excludedFolders } : {})
    };
  }

  buildPostFilters(input = {}) {
    return {
      maidName: input.searchAllKnowledgeBases ? '' : String(input.maidName || '').trim()
    };
  }
}

module.exports = {
  LightMemoDirectoryPolicy
};
