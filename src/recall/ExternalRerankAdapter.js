function ensureBaseUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return '';
  return url.endsWith('/') ? url : `${url}/`;
}

class ExternalRerankAdapter {
  constructor(config) {
    this.config = config;
  }

  isConfigured() {
    return !!(this.config.rerankUrl && this.config.rerankApiKey && this.config.rerankModel);
  }

  async rerank(query, documents) {
    const provider = this.resolveProvider();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.rerankTimeoutMs);

    try {
      const requestShape = this.buildRequestShape(provider, query, documents);
      const response = await fetch(this.getEndpointUrl(), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(requestShape.body),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`External rerank failed with status ${response.status}`);
      }

      const payload = await response.json();
      return this.normalizeResults(payload, documents, provider);
    } finally {
      clearTimeout(timeout);
    }
  }

  getEndpointUrl() {
    const provider = this.resolveProvider();
    const providerPath = this.resolveProviderPath(provider);
    return new URL(providerPath, ensureBaseUrl(this.config.rerankUrl)).toString();
  }

  buildHeaders() {
    const provider = this.resolveProvider();
    const headers = {
      Authorization: `Bearer ${this.config.rerankApiKey}`,
      'Content-Type': 'application/json'
    };

    if (provider === 'cohere') {
      headers['X-Client-Name'] = headers['X-Client-Name'] || 'codex-memory';
    }

    for (const [key, value] of Object.entries(this.config.rerankHeaders || {})) {
      headers[key] = value;
    }

    return headers;
  }

  resolveProvider() {
    if (this.config.rerankProvider) {
      return this.config.rerankProvider;
    }

    const normalizedUrl = String(this.config.rerankUrl || '').toLowerCase();
    if (normalizedUrl.includes('cohere')) return 'cohere';
    if (normalizedUrl.includes('voyage')) return 'voyage';
    if (normalizedUrl.includes('jina')) return 'jina';
    return 'generic';
  }

  resolveProviderPath(provider) {
    if (this.config.rerankPath && this.config.rerankPath !== 'v1/rerank') {
      return this.config.rerankPath;
    }

    if (provider === 'cohere') return 'v2/rerank';
    return 'v1/rerank';
  }

  buildRequestShape(provider, query, documents) {
    const documentTexts = documents.map(document => document.text || '');

    if (provider === 'voyage') {
      return {
        body: {
          model: this.config.rerankModel,
          query,
          documents: documentTexts,
          top_k: documents.length,
          truncation: true
        }
      };
    }

    if (provider === 'cohere') {
      return {
        body: {
          model: this.config.rerankModel,
          query,
          documents: documentTexts,
          top_n: documents.length,
          max_tokens_per_doc: Math.max(256, Math.floor(this.config.rerankMaxTokensPerBatch / Math.max(1, documents.length)))
        }
      };
    }

    return {
      body: {
        model: this.config.rerankModel,
        query,
        documents: documentTexts,
        top_n: documents.length
      }
    };
  }

  normalizeResults(payload, documents, provider = 'generic') {
    const rawResults = Array.isArray(payload?.results)
      ? payload.results
      : (Array.isArray(payload?.data)
        ? payload.data
        : (Array.isArray(payload?.rankings) ? payload.rankings : []));

    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      throw new Error('External rerank returned invalid results');
    }

    return rawResults
      .map(item => {
        const index = Number.isInteger(item?.index)
          ? item.index
          : (Number.isInteger(item?.document_index) ? item.document_index : item?.documentIndex);
        const relevanceScore = typeof item?.relevance_score === 'number'
          ? item.relevance_score
          : (typeof item?.relevanceScore === 'number'
            ? item.relevanceScore
            : (typeof item?.score === 'number'
              ? item.score
              : (typeof item?.relevance === 'number' && provider === 'voyage' ? item.relevance : null)));
        const originalDocument = Number.isInteger(index) ? documents[index] : null;

        if (!originalDocument || typeof relevanceScore !== 'number') {
          return null;
        }

        return {
          ...originalDocument,
          rerank_score: relevanceScore
        };
      })
      .filter(Boolean);
  }
}

module.exports = {
  ExternalRerankAdapter
};
