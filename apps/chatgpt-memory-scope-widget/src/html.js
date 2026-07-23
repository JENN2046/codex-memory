'use strict';

function receiptPresentationFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const queue = [metadata];
  const visited = new Set();
  while (queue.length > 0 && visited.size < 16) {
    const candidate = queue.shift();
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) ||
        visited.has(candidate)) continue;
    visited.add(candidate);
    const presentation = candidate['codex-memory/receiptPresentation'];
    if (presentation && typeof presentation === 'object' && !Array.isArray(presentation)) {
      return presentation;
    }
    for (const key of ['_meta', 'mcp_tool_result', 'call_tool_result', 'result']) {
      const nested = candidate[key];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) queue.push(nested);
    }
  }
  return null;
}

function structuredContentFromToolResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const queue = [value];
  const visited = new Set();
  while (queue.length > 0 && visited.size < 16) {
    const candidate = queue.shift();
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) ||
        visited.has(candidate)) continue;
    visited.add(candidate);
    if (Object.hasOwn(candidate, 'scope') || typeof candidate.context_status === 'string') {
      return candidate;
    }
    for (const key of ['structuredContent', 'structured_content']) {
      const structured = candidate[key];
      if (structured && typeof structured === 'object' && !Array.isArray(structured)) {
        return structured;
      }
    }
    for (const key of ['mcp_tool_result', 'call_tool_result', 'result']) {
      const nested = candidate[key];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) queue.push(nested);
    }
  }
  return null;
}

const MEMORY_SCOPE_WIDGET_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root { color-scheme: light dark; font: 14px/1.45 system-ui, sans-serif; }
    body { margin: 0; padding: 12px; background: transparent; color: CanvasText; }
    main { border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 12px; padding: 12px; }
    h2 { font-size: 14px; margin: 0 0 8px; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 5px 10px; margin: 0; }
    dt { opacity: .65; }
    dd { margin: 0; overflow-wrap: anywhere; }
    [data-state="pending"] { opacity: .7; }
  </style>
</head>
<body>
  <main data-state="pending" aria-live="polite">
    <h2>Memory scope</h2>
    <dl>
      <dt>Project</dt><dd id="project">Not selected</dd>
      <dt>Status</dt><dd id="status">Waiting for governed result</dd>
      <dt>Visibility</dt><dd id="visibility">None</dd>
      <dt>Expires</dt><dd id="expires">Not available</dd>
      <dt>Result receipt</dt><dd id="receipt">Not available</dd>
      <dt>Context reference</dt><dd id="context-reference">Not issued</dd>
    </dl>
  </main>
  <script>
    (() => {
      const allowedStatuses = new Set(['resolved', 'missing', 'expired', 'denied', 'unavailable']);
      const safeText = (value, fallback) => typeof value === 'string' && value.length <= 160 ? value : fallback;
      const receiptPresentationFromMetadata = ${receiptPresentationFromMetadata.toString()};
      const structuredContentFromToolResult = ${structuredContentFromToolResult.toString()};
      const render = (input, toolInput, metadata) => {
        const structured = structuredContentFromToolResult(input);
        const scope = structured && typeof structured === 'object'
          ? (structured.scope || structured)
          : null;
        if (!scope || !allowedStatuses.has(scope.context_status)) return;
        const presentation = receiptPresentationFromMetadata(metadata);
        const root = document.querySelector('main');
        root.dataset.state = scope.context_status;
        document.querySelector('#project').textContent = safeText(
          scope.safe_project_alias,
          safeText(toolInput && toolInput.project_alias, 'Not selected')
        );
        document.querySelector('#status').textContent = scope.context_status;
        document.querySelector('#visibility').textContent = Array.isArray(scope.visibility_labels)
          ? scope.visibility_labels.filter(value => typeof value === 'string').slice(0, 4).join(', ') || 'None'
          : 'None';
        document.querySelector('#expires').textContent = safeText(scope.expires_at, 'Not available');
        document.querySelector('#receipt').textContent = safeText(
          presentation && presentation.result_receipt_status,
          safeText(scope.receipt_status, 'Not available')
        );
        document.querySelector('#context-reference').textContent = safeText(
          presentation && presentation.context_reference_status,
          scope.context_status === 'resolved' ? 'issued' : 'not issued'
        );
      };
      window.addEventListener('message', event => {
        if (event.source !== window.parent) return;
        const message = event.data;
        if (message && message.jsonrpc === '2.0' && message.method === 'ui/notifications/tool-result') {
          render(
            message.params,
            window.openai && window.openai.toolInput,
            message.params || (window.openai && window.openai.toolResponseMetadata)
          );
        }
      });
      if (window.openai && (window.openai.toolOutput || window.openai.toolResponseMetadata)) {
        render(
          window.openai.toolOutput || window.openai.toolResponseMetadata,
          window.openai.toolInput,
          window.openai.toolResponseMetadata
        );
      }
    })();
  </script>
</body>
</html>`;

module.exports = {
  MEMORY_SCOPE_WIDGET_HTML,
  receiptPresentationFromMetadata,
  structuredContentFromToolResult
};
