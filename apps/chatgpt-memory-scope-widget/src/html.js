'use strict';

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
    [data-state="missing"] { opacity: .7; }
  </style>
</head>
<body>
  <main data-state="missing" aria-live="polite">
    <h2>Memory scope</h2>
    <dl>
      <dt>Project</dt><dd id="project">Not selected</dd>
      <dt>Status</dt><dd id="status">Missing</dd>
      <dt>Visibility</dt><dd id="visibility">None</dd>
      <dt>Expires</dt><dd id="expires">Not available</dd>
      <dt>Receipt</dt><dd id="receipt">Not available</dd>
    </dl>
  </main>
  <script>
    (() => {
      const allowedStatuses = new Set(['resolved', 'missing', 'expired', 'denied', 'unavailable']);
      const safeText = (value, fallback) => typeof value === 'string' && value.length <= 160 ? value : fallback;
      const render = input => {
        const scope = input && typeof input === 'object' ? (input.scope || input) : null;
        if (!scope || !allowedStatuses.has(scope.context_status)) return;
        const root = document.querySelector('main');
        root.dataset.state = scope.context_status;
        document.querySelector('#project').textContent = safeText(scope.safe_project_alias, 'Not selected');
        document.querySelector('#status').textContent = scope.context_status;
        document.querySelector('#visibility').textContent = Array.isArray(scope.visibility_labels)
          ? scope.visibility_labels.filter(value => typeof value === 'string').slice(0, 4).join(', ') || 'None'
          : 'None';
        document.querySelector('#expires').textContent = safeText(scope.expires_at, 'Not available');
        document.querySelector('#receipt').textContent = safeText(scope.receipt_status, 'Not available');
      };
      window.addEventListener('message', event => {
        if (event.source !== window.parent) return;
        const message = event.data;
        if (message && message.jsonrpc === '2.0' && message.method === 'ui/notifications/tool-result') {
          render(message.params && message.params.structuredContent);
        }
      });
      if (window.openai && window.openai.toolOutput) render(window.openai.toolOutput);
    })();
  </script>
</body>
</html>`;

module.exports = { MEMORY_SCOPE_WIDGET_HTML };
