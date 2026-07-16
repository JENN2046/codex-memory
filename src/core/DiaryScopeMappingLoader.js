'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { validateMapping } = require('./DiaryScopeMapping');

function loadDiaryScopeMapping({ mapping, mappingPath, readFileSync = fs.readFileSync } = {}) {
  const configuredByInjection = mapping !== undefined && mapping !== null;
  const configuredByPath = typeof mappingPath === 'string' && mappingPath.trim().length > 0;
  if (!configuredByInjection && !configuredByPath) {
    return {
      configured: false,
      accepted: false,
      reasonCode: 'mapping_not_configured',
      mapping: null,
      mappingReference: null,
      mappingDigest: null,
      startupOnly: true,
      hotReloadAllowed: false
    };
  }
  if (configuredByInjection && configuredByPath) {
    throw new Error('diary_scope_mapping_source_ambiguous');
  }

  let candidate = mapping;
  if (configuredByPath) {
    const resolvedPath = path.resolve(mappingPath);
    let raw;
    try {
      raw = readFileSync(resolvedPath, 'utf8');
      candidate = JSON.parse(raw);
    } catch {
      throw new Error('diary_scope_mapping_load_failed');
    }
  }

  const validation = validateMapping(candidate);
  if (!validation.accepted) throw new Error('diary_scope_mapping_invalid');
  return {
    configured: true,
    accepted: true,
    reasonCode: 'mapping_loaded',
    mapping: validation.mapping,
    mappingReference: validation.mappingReference,
    mappingDigest: validation.mappingDigest,
    startupOnly: true,
    hotReloadAllowed: false
  };
}

module.exports = { loadDiaryScopeMapping };
