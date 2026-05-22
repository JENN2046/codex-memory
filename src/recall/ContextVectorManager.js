const crypto = require('node:crypto');

const { compactText } = require('./text');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

class ContextVectorManager {
  constructor({ config, vectorStore }) {
    this.config = config;
    this.vectorStore = vectorStore;
    this.vectorMap = new Map();
    this.historyAssistantVectors = [];
    this.historyUserVectors = [];
    this.fuzzyThreshold = 0.85;
  }

  async buildQueryContext({ queryText = '', contextText = '', activeBlocks = [], messages = [], queryAnalysis = {}, readOnly = false } = {}) {
    const sourceKinds = [];
    const vectors = [];

    const inlineFragments = [
      ...(contextText ? [contextText] : []),
      ...((Array.isArray(activeBlocks) ? activeBlocks : []).filter(Boolean))
    ].map(fragment => compactText(fragment)).filter(Boolean);

    if (inlineFragments.length > 0) {
      const inlineVectors = await this.vectorStore.getBatchEmbeddingsCached(inlineFragments, { inputKind: 'query-context', readOnly });
      inlineVectors.filter(Boolean).forEach(vector => vectors.push(vector));
      if (contextText) sourceKinds.push('context-text');
      if (activeBlocks.length > 0) sourceKinds.push('active-block');
    }

    let segmentCount = 0;
    if (Array.isArray(messages) && messages.length > 0) {
      await this.updateContext(messages, { readOnly });
      const userVector = this.aggregateContext('user');
      const assistantVector = this.aggregateContext('assistant');
      if (userVector) vectors.push(userVector);
      if (assistantVector) vectors.push(assistantVector);
      segmentCount = this.segmentContext(messages, this.config.contextSegmentSimilarity).length;
      if (userVector || assistantVector) {
        sourceKinds.push('message-history');
      }
    }

    if (vectors.length === 0) {
      return {
        available: false,
        vector: null,
        logicDepth: 0,
        semanticWidth: 0,
        blendWeight: 0,
        sourceKinds: [],
        segmentCount: 0,
        signature: ''
      };
    }

    const vector = this.averageVectors(vectors);
    const logicDepth = Number(this.computeLogicDepth(vector).toFixed(6));
    const semanticWidth = Number(this.computeSemanticWidth(vector).toFixed(6));
    const blendWeight = Number(this.computeBlendWeight(queryAnalysis, semanticWidth, logicDepth, sourceKinds).toFixed(6));
    const signature = crypto.createHash('sha1').update(JSON.stringify({
      queryText: compactText(queryText).toLowerCase(),
      contextText: compactText(contextText).toLowerCase(),
      activeBlocks: inlineFragments.map(fragment => fragment.toLowerCase()),
      sourceKinds: [...new Set(sourceKinds)].sort(),
      segmentCount,
      logicDepth,
      semanticWidth
    })).digest('hex');

    return {
      available: true,
      vector,
      logicDepth,
      semanticWidth,
      blendWeight,
      sourceKinds: [...new Set(sourceKinds)],
      segmentCount,
      signature
    };
  }

  async updateContext(messages = [], options = {}) {
    if (!Array.isArray(messages) || messages.length === 0) return;

    const lastUserIndex = this.findLastIndex(messages, message => message?.role === 'user');
    const lastAssistantIndex = this.findLastIndex(messages, message => message?.role === 'assistant');
    const assistantVectors = [];
    const userVectors = [];

    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index];
      if (!message || message.role === 'system') continue;
      if (index === lastUserIndex || index === lastAssistantIndex) continue;

      const content = this.extractMessageText(message);
      if (!content) continue;

      const normalized = this.normalize(content);
      const hash = this.createHash(normalized);

      let vector = this.vectorMap.get(hash)?.vector || null;
      if (!vector) {
        vector = this.findFuzzyMatch(normalized);
      }
      if (!vector) {
        vector = await this.vectorStore.getEmbeddingFromCacheOnly(content);
      }
      if (!vector) {
        vector = await this.vectorStore.getSingleEmbeddingCached(content, {
          inputKind: 'query-context',
          readOnly: options.readOnly === true
        });
      }
      if (!vector) continue;

      this.vectorMap.set(hash, {
        vector,
        role: message.role,
        originalText: content,
        timestamp: Date.now()
      });

      const entry = { index, vector };
      if (message.role === 'assistant') assistantVectors.push(entry);
      if (message.role === 'user') userVectors.push(entry);
    }

    this.historyAssistantVectors = assistantVectors.sort((left, right) => left.index - right.index).map(entry => entry.vector);
    this.historyUserVectors = userVectors.sort((left, right) => left.index - right.index).map(entry => entry.vector);
  }

  aggregateContext(role = 'assistant') {
    let vectors = role === 'assistant' ? this.historyAssistantVectors : this.historyUserVectors;
    if (!Array.isArray(vectors) || vectors.length === 0) return null;
    if (vectors.length > this.config.contextVectorMaxWindow) {
      vectors = vectors.slice(-this.config.contextVectorMaxWindow);
    }

    const weightedVectors = [];
    for (let index = 0; index < vectors.length; index += 1) {
      const age = vectors.length - index;
      const weight = Math.pow(this.config.contextVectorDecayRate, age);
      weightedVectors.push({
        vector: vectors[index],
        weight
      });
    }

    return this.averageVectors(weightedVectors.map(entry => entry.vector), weightedVectors.map(entry => entry.weight));
  }

  segmentContext(messages = [], similarityThreshold = 0.7) {
    if (!Array.isArray(messages) || messages.length === 0) return [];

    const sequence = [];
    messages.forEach((message, index) => {
      if (!message || message.role === 'system') return;
      const content = this.extractMessageText(message);
      if (!content) return;

      const normalized = this.normalize(content);
      const hash = this.createHash(normalized);
      const cached = this.vectorMap.get(hash);
      if (!cached?.vector) return;
      sequence.push({
        index,
        role: message.role,
        text: content,
        vector: cached.vector
      });
    });

    if (sequence.length === 0) return [];

    const segments = [];
    let current = {
      vectors: [sequence[0].vector],
      texts: [sequence[0].text],
      roles: [sequence[0].role],
      startIndex: sequence[0].index,
      endIndex: sequence[0].index
    };

    for (let index = 1; index < sequence.length; index += 1) {
      const previous = sequence[index - 1];
      const next = sequence[index];
      const similarity = this.cosineSimilarity(previous.vector, next.vector);

      if (similarity >= similarityThreshold) {
        current.vectors.push(next.vector);
        current.texts.push(next.text);
        current.roles.push(next.role);
        current.endIndex = next.index;
      } else {
        segments.push(this.finalizeSegment(current));
        current = {
          vectors: [next.vector],
          texts: [next.text],
          roles: [next.role],
          startIndex: next.index,
          endIndex: next.index
        };
      }
    }

    segments.push(this.finalizeSegment(current));
    return segments;
  }

  finalizeSegment(segment) {
    return {
      vector: this.averageVectors(segment.vectors),
      text: segment.texts.join('\n'),
      roles: [...new Set(segment.roles)],
      range: [segment.startIndex, segment.endIndex],
      count: segment.vectors.length
    };
  }

  averageVectors(vectors = [], weights = []) {
    const available = vectors.filter(vector => Array.isArray(vector) && vector.length > 0);
    if (available.length === 0) return null;

    const dimensions = available[0].length;
    const output = new Array(dimensions).fill(0);
    let totalWeight = 0;

    for (let index = 0; index < available.length; index += 1) {
      const vector = available[index];
      const weight = Number(weights[index] || 1);
      for (let dimension = 0; dimension < dimensions; dimension += 1) {
        output[dimension] += (vector[dimension] || 0) * weight;
      }
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      for (let dimension = 0; dimension < dimensions; dimension += 1) {
        output[dimension] /= totalWeight;
      }
    }

    const norm = Math.sqrt(output.reduce((sum, value) => sum + value * value, 0));
    return norm === 0 ? output : output.map(value => value / norm);
  }

  computeBlendWeight(queryAnalysis, semanticWidth, logicDepth, sourceKinds = []) {
    const resonance = Number(queryAnalysis?.metrics?.resonance || 0);
    const activeBoost = sourceKinds.includes('active-block') ? 0.06 : 0;
    const historyBoost = sourceKinds.includes('message-history') ? 0.04 : 0;
    return clamp(
      this.config.contextVectorWeight + resonance * 0.08 + semanticWidth * 0.06 + logicDepth * 0.04 + activeBoost + historyBoost,
      0.08,
      0.38
    );
  }

  computeLogicDepth(vector, topK = 32) {
    if (!Array.isArray(vector) || vector.length === 0) return 0;
    const energies = vector.map(value => value * value);
    const totalEnergy = energies.reduce((sum, value) => sum + value, 0);
    if (totalEnergy <= 0) return 0;

    const sorted = [...energies].sort((left, right) => right - left);
    const boundedTopK = Math.min(topK, sorted.length);
    const focusedEnergy = sorted.slice(0, boundedTopK).reduce((sum, value) => sum + value, 0);
    const expectedUniform = boundedTopK / sorted.length;
    const concentration = focusedEnergy / totalEnergy;
    return clamp((concentration - expectedUniform) / (1 - expectedUniform || 1), 0, 1);
  }

  computeSemanticWidth(vector) {
    if (!Array.isArray(vector) || vector.length === 0) return 0;
    let entropy = 0;
    for (const value of vector) {
      const probability = value * value;
      if (probability > 1e-12) {
        entropy -= probability * Math.log(probability);
      }
    }
    return clamp(entropy / Math.log(vector.length || 1), 0, 1);
  }

  extractMessageText(message) {
    if (!message) return '';
    if (typeof message.content === 'string') return compactText(message.content);
    if (Array.isArray(message.content)) {
      return compactText(
        message.content
          .filter(part => part && typeof part === 'object' && part.type === 'text')
          .map(part => part.text || '')
          .join('\n')
      );
    }
    return '';
  }

  normalize(text) {
    return compactText(String(text || '').toLowerCase());
  }

  createHash(text) {
    return crypto.createHash('sha256').update(String(text || '')).digest('hex');
  }

  findFuzzyMatch(normalizedText) {
    for (const entry of this.vectorMap.values()) {
      const similarity = this.calculateSimilarity(normalizedText, this.normalize(entry.originalText));
      if (similarity >= this.fuzzyThreshold) {
        return entry.vector;
      }
    }
    return null;
  }

  calculateSimilarity(left, right) {
    if (left === right) return 1;
    if (left.length < 2 || right.length < 2) return 0;

    const leftBigrams = this.collectBigrams(left);
    const rightBigrams = this.collectBigrams(right);
    let intersection = 0;

    for (const token of leftBigrams) {
      if (rightBigrams.has(token)) {
        intersection += 1;
      }
    }

    return (2 * intersection) / (leftBigrams.size + rightBigrams.size);
  }

  collectBigrams(text) {
    const output = new Set();
    for (let index = 0; index < text.length - 1; index += 1) {
      output.add(text.slice(index, index + 2));
    }
    return output;
  }

  cosineSimilarity(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length === 0) {
      return 0;
    }

    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;

    for (let index = 0; index < left.length; index += 1) {
      dot += (left[index] || 0) * (right[index] || 0);
      leftNorm += (left[index] || 0) * (left[index] || 0);
      rightNorm += (right[index] || 0) * (right[index] || 0);
    }

    if (leftNorm === 0 || rightNorm === 0) return 0;
    return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
  }

  findLastIndex(items, predicate) {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (predicate(items[index], index)) {
        return index;
      }
    }
    return -1;
  }
}

module.exports = {
  ContextVectorManager
};
