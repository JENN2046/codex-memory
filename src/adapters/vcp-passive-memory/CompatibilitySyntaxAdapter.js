class CompatibilitySyntaxAdapter {
  parse(input = '') {
    const source = typeof input === 'string' ? input : '';
    const rawPassiveBlocks = [...source.matchAll(/\[\[(.+?)\]\]/g)].map(match => match[1].trim()).filter(Boolean);
    const activeBlocks = [...source.matchAll(/<<(.+?)>>/g)].map(match => match[1].trim()).filter(Boolean);
    const directives = this.extractDirectives(source);
    const passiveBlocks = rawPassiveBlocks
      .map(block => this.stripDirectives(block))
      .map(block => block.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const stripped = this.stripDirectives(source)
      .replace(/\[\[(.+?)\]\]/g, ' ')
      .replace(/<<(.+?)>>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      raw: source,
      query: passiveBlocks.join(' ') || stripped,
      passiveBlocks,
      activeBlocks,
      directives,
      modifiers: Object.keys(directives)
    };
  }

  extractDirectives(source) {
    const directives = {};
    const matches = source.match(/::[^\s]+/g) || [];

    for (const rawToken of matches) {
      const token = rawToken.replace(/[\]>]+$/g, '');
      const match = token.match(/^::([A-Za-z]+)(?:\+([0-9.]+)?)?(?:\(([^)]*)\)|=([^\s]+))?$/);
      if (!match) continue;

      const name = match[1].trim().toLowerCase();
      const plusValue = match[2];
      const argValue = (match[3] || match[4] || '').trim();

      if (name === 'rerank') {
        directives.rerank = true;
        if (plusValue !== undefined) {
          directives.rerankplus = plusValue ? Number.parseFloat(plusValue) : 0.5;
        }
        continue;
      }

      if (name === 'tagmemo') {
        directives.tagmemo = plusValue
          ? Number.parseFloat(plusValue)
          : (argValue || true);
        if (rawToken.includes('+')) {
          directives.geodesicrerank = true;
        }
        continue;
      }

      directives[name] = argValue || true;
    }

    return directives;
  }

  stripDirectives(text) {
    return String(text || '')
      .replace(/::[A-Za-z]+(?:\+[0-9.]*)?(?:\([^)]*\)|=[^\s\]]+)?/g, ' ')
      .trim();
  }
}

module.exports = {
  CompatibilitySyntaxAdapter
};
