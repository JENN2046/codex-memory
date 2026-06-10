'use strict';

const { extractDeterministicTags } = require('./tag-extraction');

const INPUT_SCHEMA_VERSION = 'tagmemo-deterministic-extraction-input-v1';
const PROJECTION_SCHEMA_VERSION = 'tagmemo-runtime-noop-projection-v1';
const BOUNDED_MEMORY_TEXT_MAX_LENGTH = 1200;
const BOUNDED_SUMMARY_MAX_LENGTH = 300;
const BOUNDED_TITLE_MAX_LENGTH = 200;
const MAX_EXPLICIT_TAGS = 12;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function collapseWhitespace(value) {
  return normalizeString(value).replace(/\s+/g, ' ');
}

function boundedString(value, maxLength) {
  return collapseWhitespace(value).slice(0, maxLength);
}

function normalizeTags(value) {
  const tags = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return [...new Set(tags
    .map(tag => collapseWhitespace(tag))
    .filter(Boolean))]
    .slice(0, MAX_EXPLICIT_TAGS);
}

function toBoundedMemoryId(memoryId) {
  const normalized = normalizeString(memoryId)
    .replace(/^memory:/, '')
    .replace(/[^a-z0-9:_-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return normalized ? `memory:${normalized}` : '';
}

function buildRuntimeNoopProjectionFailure(reason, memoryId = null) {
  return {
    schemaVersion: PROJECTION_SCHEMA_VERSION,
    projectionMode: 'runtime_noop',
    memoryId: memoryId || null,
    tags: [],
    rejected: true,
    reason,
    lowDisclosure: true,
    persisted: false,
    publicResponse: false,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

function buildRuntimeNoopProjectionInput(record = {}) {
  const memoryId = toBoundedMemoryId(record.memoryId);
  if (!memoryId) {
    return {
      ok: false,
      projection: buildRuntimeNoopProjectionFailure('missing_memory_id')
    };
  }

  return {
    ok: true,
    input: {
      schemaVersion: INPUT_SCHEMA_VERSION,
      memoryId,
      boundedMemoryText: boundedString(record.content, BOUNDED_MEMORY_TEXT_MAX_LENGTH),
      metadataProjection: {
        title: boundedString(record.title, BOUNDED_TITLE_MAX_LENGTH),
        summary: boundedString(record.evidence, BOUNDED_SUMMARY_MAX_LENGTH),
        explicitTags: normalizeTags(record.tags),
        queryCoreTags: [],
        sourceKind: 'selected_projection'
      }
    }
  };
}

function createTagMemoRuntimeNoopProjection(record = {}, options = {}) {
  const projectionInput = buildRuntimeNoopProjectionInput(record);
  if (!projectionInput.ok) {
    return projectionInput.projection;
  }

  const extractor = typeof options.extractor === 'function'
    ? options.extractor
    : extractDeterministicTags;

  let extraction;
  try {
    extraction = extractor(projectionInput.input, options.extractionOptions || {});
  } catch (error) {
    return buildRuntimeNoopProjectionFailure(
      'tag_extraction_failed',
      projectionInput.input.memoryId
    );
  }

  return {
    schemaVersion: PROJECTION_SCHEMA_VERSION,
    projectionMode: 'runtime_noop',
    memoryId: extraction?.memoryId || projectionInput.input.memoryId,
    tags: Array.isArray(extraction?.tags) ? extraction.tags : [],
    rejected: extraction?.rejected === true,
    reason: extraction?.reason || null,
    lowDisclosure: true,
    persisted: false,
    publicResponse: false,
    mutated: false,
    providerCalls: Number.isFinite(extraction?.providerCalls) ? extraction.providerCalls : 0,
    publicMcpExpansion: Number.isFinite(extraction?.publicMcpExpansion)
      ? extraction.publicMcpExpansion
      : 0
  };
}

module.exports = {
  BOUNDED_MEMORY_TEXT_MAX_LENGTH,
  BOUNDED_SUMMARY_MAX_LENGTH,
  BOUNDED_TITLE_MAX_LENGTH,
  buildRuntimeNoopProjectionFailure,
  buildRuntimeNoopProjectionInput,
  createTagMemoRuntimeNoopProjection
};
