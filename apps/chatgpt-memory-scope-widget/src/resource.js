'use strict';

const { WIDGET_RESOURCE_URI } = require('../../../packages/chatgpt-r4-contracts');

const widgetResource = Object.freeze({
  uri: WIDGET_RESOURCE_URI,
  name: 'codex-memory ChatGPT R4 memory scope status',
  mimeType: 'text/html;profile=mcp-app',
  _meta: Object.freeze({
    ui: Object.freeze({
      prefersBorder: true,
      csp: Object.freeze({ connectDomains: [], resourceDomains: [] })
    }),
    'openai/widgetDescription': 'Shows only the safe project alias, context status and expiry, permitted visibility labels, governed-result receipt status, and whether a usable context reference was issued. It never displays raw memory or controls diary authorization.'
  })
});

module.exports = { widgetResource };
