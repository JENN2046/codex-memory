function ensureBaseUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return '';
  return url.endsWith('/') ? url : `${url}/`;
}

class ExternalEmbeddingAdapter {
  constructor(config) {
    this.config = config;
  }

  isConfigured() {
    return this.getEndpointCandidates().length > 0;
  }

  getEndpointCandidates() {
    if (Array.isArray(this.config.embeddingEndpoints) && this.config.embeddingEndpoints.length > 0) {
      return this.config.embeddingEndpoints
        .filter(endpoint => endpoint && endpoint.url && endpoint.model)
        .map((endpoint, index) => ({
          name: endpoint.name || `embedding-${index + 1}`,
          provider: endpoint.provider || '',
          url: endpoint.url,
          apiKey: endpoint.apiKey || '',
          model: endpoint.model,
          path: endpoint.path || 'v1/embeddings',
          headers: endpoint.headers || {},
          timeoutMs: endpoint.timeoutMs || this.config.embeddingTimeoutMs,
          dimensions: endpoint.dimensions || this.config.embedDimensions
        }));
    }

    if (this.config.embeddingUrl && this.config.embeddingModel) {
      return [{
        name: 'configured-primary',
        provider: this.config.embeddingProvider || '',
        url: this.config.embeddingUrl,
        apiKey: this.config.embeddingApiKey || '',
        model: this.config.embeddingModel,
        path: this.config.embeddingPath || 'v1/embeddings',
        headers: this.config.embeddingHeaders || {},
        timeoutMs: this.config.embeddingTimeoutMs,
        dimensions: this.config.embedDimensions
      }];
    }

    return [];
  }

  getPrimaryEndpoint() {
    return this.getEndpointCandidates()[0] || null;
  }

  getCacheIdentity() {
    const candidates = this.getEndpointCandidates();
    if (candidates.length === 0) return 'local-hash';

    return candidates
      .map(endpoint => JSON.stringify({
        name: endpoint.name,
        provider: endpoint.provider,
        model: endpoint.model,
        url: endpoint.url,
        path: endpoint.path,
        dimensions: endpoint.dimensions || this.config.embedDimensions
      }))
      .join(' -> ');
  }

  resolveProvider(endpoint = null) {
    const source = endpoint || this.getPrimaryEndpoint() || this.config;
    if (source.provider) {
      return source.provider;
    }

    const normalizedUrl = String(source.url || source.embeddingUrl || '').toLowerCase();
    if (normalizedUrl.includes('cohere')) return 'cohere';
    if (normalizedUrl.includes('voyage')) return 'voyage';
    if (normalizedUrl.includes('jina')) return 'jina';
    if (normalizedUrl.includes('nvidia')) return 'nvidia';
    return 'generic';
  }

  resolvePath(endpoint = null) {
    const source = endpoint || this.getPrimaryEndpoint() || this.config;
    const provider = this.resolveProvider(source);
    if (source.path && source.path !== 'v1/embeddings') {
      return source.path;
    }

    if (provider === 'cohere') return 'v2/embed';
    return 'v1/embeddings';
  }

  getEndpointUrl(endpoint = null) {
    const source = endpoint || this.getPrimaryEndpoint();
    if (!source?.url) return '';
    return new URL(this.resolvePath(source), ensureBaseUrl(source.url)).toString();
  }

  buildHeaders(endpoint = null) {
    const source = endpoint || this.getPrimaryEndpoint() || this.config;
    const provider = this.resolveProvider(source);
    const headers = {
      'Content-Type': 'application/json'
    };

    if (source.apiKey) {
      headers.Authorization = `Bearer ${source.apiKey}`;
    }

    if (provider === 'cohere') {
      headers['X-Client-Name'] = headers['X-Client-Name'] || 'codex-memory';
    }

    for (const [key, value] of Object.entries(source.headers || {})) {
      headers[key] = value;
    }

    return headers;
  }

  buildBody(endpoint, texts, options = {}) {
    const provider = this.resolveProvider(endpoint);
    const dimensions = endpoint?.dimensions || this.config.embedDimensions;
    const inputKind = options.inputKind === 'query' ? 'query' : 'document';

    if (provider === 'cohere') {
      return {
        model: endpoint.model,
        input_type: inputKind === 'query' ? 'search_query' : 'search_document',
        texts,
        embedding_types: ['float'],
        output_dimension: dimensions
      };
    }

    if (provider === 'voyage') {
      return {
        model: endpoint.model,
        input: texts,
        input_type: inputKind,
        truncation: true,
        output_dimension: dimensions
      };
    }

    if (provider === 'jina') {
      return {
        model: endpoint.model,
        input: texts,
        task: inputKind === 'query' ? 'retrieval.query' : 'retrieval.passage'
      };
    }

    return {
      model: endpoint.model,
      input: texts
    };
  }

  async embedBatch(texts, options = {}) {
    const normalizedTexts = (Array.isArray(texts) ? texts : [])
      .map(text => String(text || '').trim())
      .filter(Boolean);
    if (normalizedTexts.length === 0) return [];

    const failures = [];
    for (const endpoint of this.getEndpointCandidates()) {
      const provider = this.resolveProvider(endpoint);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), endpoint.timeoutMs || this.config.embeddingTimeoutMs);

      try {
        const response = await fetch(this.getEndpointUrl(endpoint), {
          method: 'POST',
          headers: this.buildHeaders(endpoint),
          body: JSON.stringify(this.buildBody(endpoint, normalizedTexts, options)),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }

        const payload = await response.json();
        return this.normalizeEmbeddings(payload, provider, normalizedTexts.length);
      } catch (error) {
        failures.push(`${endpoint.name || endpoint.model}: ${error.message}`);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(`External embedding failed for all configured endpoints: ${failures.join('; ')}`);
  }

  normalizeEmbeddings(payload, provider, expectedCount) {
    if (provider === 'cohere') {
      const embeddings = Array.isArray(payload?.embeddings?.float)
        ? payload.embeddings.float
        : (Array.isArray(payload?.embeddings) ? payload.embeddings : []);
      if (!Array.isArray(embeddings)) {
        throw new Error('External embedding returned invalid Cohere payload');
      }
      return embeddings.slice(0, expectedCount);
    }

    const rows = Array.isArray(payload?.data)
      ? payload.data
      : (Array.isArray(payload?.embeddings) ? payload.embeddings : []);

    if (!Array.isArray(rows)) {
      throw new Error('External embedding returned invalid payload');
    }

    const output = new Array(expectedCount).fill(null);
    rows.forEach((row, index) => {
      const targetIndex = Number.isInteger(row?.index) ? row.index : index;
      const vector = Array.isArray(row?.embedding)
        ? row.embedding
        : (Array.isArray(row) ? row : null);
      if (targetIndex >= 0 && targetIndex < output.length && Array.isArray(vector)) {
        output[targetIndex] = vector;
      }
    });

    return output;
  }
}

module.exports = {
  ExternalEmbeddingAdapter
};
