'use strict';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizedRelativeSegments(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value.replace(/\\/g, '/');
  if (normalized.startsWith('/') || normalized.startsWith('//') || /^[A-Za-z]:\//.test(normalized)) {
    return null;
  }
  const segments = normalized.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) return null;
  return segments;
}

function postCheckNativeDiaryResults(results, allowedDiaryNames) {
  if (!Array.isArray(results) || !Array.isArray(allowedDiaryNames) || allowedDiaryNames.length < 1) {
    return { accepted: false, reasonCode: 'native_result_source_missing' };
  }
  const allowed = new Set(allowedDiaryNames);
  if (allowed.size !== allowedDiaryNames.length) {
    return { accepted: false, reasonCode: 'native_result_allowlist_invalid' };
  }

  for (const result of results) {
    if (!isPlainObject(result)) return { accepted: false, reasonCode: 'native_result_source_missing' };
    if (allowedDiaryNames.length > 1) {
      if (typeof result.diaryName !== 'string' || !allowed.has(result.diaryName)) {
        return { accepted: false, reasonCode: 'native_result_diary_mismatch' };
      }
      continue;
    }
    const segments = normalizedRelativeSegments(result.fullPath);
    if (!segments) return { accepted: false, reasonCode: 'native_result_path_invalid' };
    if (segments[0] !== allowedDiaryNames[0]) {
      return { accepted: false, reasonCode: 'native_result_diary_mismatch' };
    }
  }
  return {
    accepted: true,
    reasonCode: 'native_result_scope_postcheck_passed',
    resultCount: results.length,
    rawResultDisclosed: false
  };
}

module.exports = { normalizedRelativeSegments, postCheckNativeDiaryResults };
