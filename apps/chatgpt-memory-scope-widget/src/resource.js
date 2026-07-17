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
    'openai/widgetDescription': 'Shows only the safe project alias, context expiry, permitted visibility labels, and receipt binding status. It never displays raw memory or controls diary authorization.'
  })
});

module.exports = { widgetResource };
