'use strict';

const { validateToolArguments, validateWidgetDto, reject } = require('../../../packages/chatgpt-r4-contracts');

function parseToolResultNotification(message) {
  if (!message || message.jsonrpc !== '2.0' || message.method !== 'ui/notifications/tool-result') {
    reject('widget_tool_result_notification_invalid');
  }
  const structuredContent = message.params?.structuredContent;
  const dto = structuredContent?.scope || structuredContent;
  return validateWidgetDto(dto);
}

function buildResolveContextCall({ id, projectAlias, requestedVisibility }) {
  if (!(typeof id === 'string' || Number.isInteger(id))) reject('widget_rpc_id_invalid');
  const args = { project_alias: projectAlias };
  if (requestedVisibility !== undefined) args.requested_visibility = requestedVisibility;
  validateToolArguments('resolve_memory_context', args);
  return {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name: 'resolve_memory_context',
      arguments: args
    }
  };
}

module.exports = {
  parseToolResultNotification,
  buildResolveContextCall
};
