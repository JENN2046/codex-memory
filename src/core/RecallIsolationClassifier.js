const ISOLATION_CLASSIFIER_VERSION = 'recall-isolation-classifier-v1';

const ISOLATED_RECORD_FAMILIES = Object.freeze([
  'governance_records',
  'validation_transcripts',
  'redaction_samples',
  'policy_decisions',
  'readiness_reports',
  'migration_metadata',
  'blocked_memory',
  'tombstoned_memory',
  'out_of_scope_memory'
]);

const FAMILY_RULES = Object.freeze({
  governance_records: {
    tags: ['governance-record', 'branch-governance-record', 'isolation:governance_records']
  },
  validation_transcripts: {
    tags: ['validation-transcript', 'ci-transcript', 'gate-transcript', 'isolation:validation_transcripts']
  },
  redaction_samples: {
    tags: ['redaction-sample', 'redact-sample', 'isolation:redaction_samples']
  },
  policy_decisions: {
    tags: ['policy-decision', 'isolation:policy_decisions']
  },
  readiness_reports: {
    tags: ['readiness-report', 'preflight-report', 'isolation:readiness_reports']
  },
  migration_metadata: {
    tags: ['migration-metadata', 'import-metadata', 'export-metadata', 'backup-metadata', 'restore-metadata', 'isolation:migration_metadata']
  },
  blocked_memory: {
    tags: ['blocked-memory', 'rejected-memory', 'isolation:blocked_memory'],
    statuses: ['blocked', 'rejected']
  },
  tombstoned_memory: {
    tags: ['tombstoned-memory', 'superseded-memory', 'isolation:tombstoned_memory'],
    statuses: ['tombstoned', 'superseded'],
    structuralFields: ['tombstoneReason', 'tombstone_reason', 'supersededBy', 'superseded_by']
  },
  out_of_scope_memory: {}
});

function normalizeString(value) {
  return String(value || '').trim();
}

function firstNormalizedString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase();
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeLower).filter(Boolean);
}

function normalizeText(subject = {}) {
  return [
    subject.title,
    subject.text,
    subject.content,
    subject.evidence,
    Array.isArray(subject.tags) ? subject.tags.join(' ') : subject.tags
  ]
    .map(normalizeLower)
    .filter(Boolean)
    .join('\n');
}

function normalizeFamilyValue(value) {
  return normalizeLower(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function listExplicitFamilies(subject = {}, tags = []) {
  const values = [
    subject.isolationFamily,
    subject.isolation_family,
    subject.recordFamily,
    subject.record_family,
    subject.classificationFamily,
    subject.classification_family,
    subject.recallClassification,
    subject.recall_classification
  ];
  const text = normalizeText(subject);
  const headerPattern = /(?:^|\n)\s*(?:isolation-family|isolation_family|record-family|record_family|classification-family|classification_family|recall-classification|recall_classification)\s*:\s*([a-z0-9_-]+)/gi;
  let match;
  while ((match = headerPattern.exec(text)) !== null) {
    values.push(match[1]);
  }

  for (const tag of tags) {
    if (tag.startsWith('isolation:')) values.push(tag.slice('isolation:'.length));
    if (tag.startsWith('record-family:')) values.push(tag.slice('record-family:'.length));
    if (tag.startsWith('classification:')) values.push(tag.slice('classification:'.length));
  }

  return values
    .map(normalizeFamilyValue)
    .filter(value => ISOLATED_RECORD_FAMILIES.includes(value));
}

function hasStructuralField(subject, fields = []) {
  return fields.some(field => Boolean(subject?.[field]));
}

function matchesOutOfScope(subject = {}, options = {}) {
  const expectedProjectId = normalizeString(options.expectedProjectId);
  const expectedWorkspaceId = normalizeString(options.expectedWorkspaceId);
  const expectedClientId = normalizeString(options.expectedClientId);
  const expectedVisibility = Array.isArray(options.expectedVisibility)
    ? options.expectedVisibility.map(normalizeString).filter(Boolean)
    : [];

  if (expectedProjectId && firstNormalizedString(subject.projectId, subject.project_id) !== expectedProjectId) {
    return true;
  }
  if (expectedWorkspaceId && firstNormalizedString(subject.workspaceId, subject.workspace_id) !== expectedWorkspaceId) {
    return true;
  }
  if (expectedClientId && firstNormalizedString(subject.clientId, subject.client_id) !== expectedClientId) {
    return true;
  }
  if (
    expectedVisibility.length > 0 &&
    !expectedVisibility.includes(firstNormalizedString(subject.visibility, subject.visibility_policy))
  ) {
    return true;
  }

  return false;
}

function classifyRecallIsolationSubject(subject = {}, options = {}) {
  const safeSubject = subject && typeof subject === 'object' ? subject : {};
  const tags = normalizeTags(safeSubject.tags);
  const status = normalizeLower(firstNormalizedString(
    safeSubject.status,
    safeSubject.lifecycleStatus,
    safeSubject.lifecycle_status
  ));
  const explicitFamilies = new Set(listExplicitFamilies(safeSubject, tags));
  const families = [];
  const reasons = [];

  for (const family of ISOLATED_RECORD_FAMILIES) {
    if (family === 'out_of_scope_memory') {
      if (matchesOutOfScope(safeSubject, options)) {
        families.push(family);
        reasons.push(`${family}:scope_policy`);
      }
      continue;
    }

    const rule = FAMILY_RULES[family] || {};
    const familyMatch = explicitFamilies.has(family);
    const tagMatch = (rule.tags || []).some(tag => tags.includes(tag));
    const statusMatch = status && (rule.statuses || []).includes(status);
    const structuralMatch = hasStructuralField(safeSubject, rule.structuralFields);

    if (familyMatch || tagMatch || statusMatch || structuralMatch) {
      families.push(family);
      reasons.push(`${family}:${[
        familyMatch ? 'family' : '',
        tagMatch ? 'tag' : '',
        statusMatch ? 'status' : '',
        structuralMatch ? 'structural' : ''
      ].filter(Boolean).join('+')}`);
    }
  }

  return {
    isolated: families.length > 0,
    families,
    reasons,
    classifierVersion: ISOLATION_CLASSIFIER_VERSION
  };
}

function isRecallIsolated(subject = {}, options = {}) {
  return classifyRecallIsolationSubject(subject, options).isolated;
}

function filterRecallIsolatedItems(items = [], options = {}) {
  return (Array.isArray(items) ? items : [])
    .filter(item => !isRecallIsolated(item, options));
}

module.exports = {
  ISOLATED_RECORD_FAMILIES,
  ISOLATION_CLASSIFIER_VERSION,
  classifyRecallIsolationSubject,
  filterRecallIsolatedItems,
  isRecallIsolated
};
