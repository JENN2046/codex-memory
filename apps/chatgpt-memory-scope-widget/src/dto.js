'use strict';

const { SCHEMA_VERSION, validateWidgetDto } = require('../../../packages/chatgpt-r4-contracts');

function createMemoryScopeDto({
  safeProjectAlias,
  contextStatus,
  expiresAt,
  visibilityLabels,
  receiptStatus
}) {
  const dto = {
    schema_version: SCHEMA_VERSION,
    safe_project_alias: safeProjectAlias,
    context_status: contextStatus,
    expires_at: expiresAt,
    visibility_labels: [...visibilityLabels],
    receipt_status: receiptStatus
  };
  validateWidgetDto(dto);
  return Object.freeze(dto);
}

module.exports = { createMemoryScopeDto };
