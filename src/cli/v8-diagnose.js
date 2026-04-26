#!/usr/bin/env node
const { createConfig } = require('../config/createConfig');
const { CompatibilitySyntaxAdapter } = require('../adapters/vcp-passive-memory/CompatibilitySyntaxAdapter');
const { TimeExpressionParser } = require('../recall/TimeExpressionParser');
const { TagMemoEngine } = require('../recall/TagMemoEngine');

function parseArgs(argv) {
  const options = {
    json: false,
    query: ''
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--query') {
      options.query = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (!token.startsWith('--') && !options.query) {
      options.query = token;
    }
  }

  return options;
}

function buildV8Diagnosis(config, query) {
  if (!query || !String(query).trim()) {
    throw new Error('v8-diagnose requires --query <text>');
  }

  const compatibilitySyntaxAdapter = new CompatibilitySyntaxAdapter();
  const timeExpressionParser = new TimeExpressionParser();
  const tagMemoEngine = new TagMemoEngine({ config });
  const parsed = compatibilitySyntaxAdapter.parse(query);
  const timeRanges = timeExpressionParser.parse(query, parsed.directives?.time);
  const analysis = tagMemoEngine.analyzeQuery({
    rawQuery: query,
    query: parsed.query || query,
    passiveBlocks: parsed.passiveBlocks || [],
    directives: parsed.directives || {},
    timeRanges
  });

  return {
    mode: 'v8-diagnose',
    destructive: false,
    embeddingProfile: {
      fingerprint: config.embeddingFingerprint,
      version: config.embeddingProfileVersion,
      model: config.embeddingModel || 'local-hash',
      dimensions: config.embedDimensions,
      ragProfile: {
        available: !!config.ragProfile?.available,
        selectedProfile: config.ragProfile?.selectedProfile || null,
        error: config.ragProfile?.error || null
      }
    },
    query: {
      raw: query,
      normalized: analysis.queryText,
      passiveBlocks: parsed.passiveBlocks || [],
      activeBlocks: parsed.activeBlocks || [],
      directives: parsed.directives || {},
      timeRanges: timeRanges.map(range => ({
        start: range.start.toISOString(),
        end: range.end.toISOString()
      }))
    },
    terrain: {
      dominantAxes: analysis.metrics.dominantAxes,
      terrainBasis: analysis.metrics.terrainBasis,
      energySignature: analysis.metrics.energySignature,
      logicDepth: analysis.metrics.logicDepth,
      resonance: analysis.metrics.resonance,
      semanticWidth: analysis.metrics.semanticWidth,
      entropy: analysis.metrics.entropy
    },
    residualPyramid: analysis.pyramid,
    tagMemo: {
      coreTags: analysis.coreTags,
      mode: analysis.tagMemoMode,
      dynamicTagWeight: analysis.dynamicTagWeight,
      dynamicCoreWeight: analysis.dynamicCoreWeight
    },
    metaThinking: analysis.metaThinking,
    geodesic: {
      requested: !!parsed.directives?.geodesicrerank,
      alpha: config.geodesicRerank?.alpha ?? null,
      minGeoSamples: config.geodesicRerank?.minGeoSamples ?? null,
      willUse: !!(parsed.directives?.geodesicrerank || parsed.directives?.rerankplus !== undefined)
    }
  };
}

function renderText(report) {
  const axes = (report.terrain.dominantAxes || [])
    .slice(0, 4)
    .map(axis => `${axis.label}:${axis.energy.toFixed(3)}`)
    .join(', ') || 'none';
  const coreTags = (report.tagMemo.coreTags || []).join(', ') || 'none';
  const reasons = (report.metaThinking.reasons || []).join(', ') || 'none';

  return [
    'codex-memory v8 diagnose',
    `fingerprint: ${report.embeddingProfile.fingerprint}`,
    `query: ${report.query.normalized}`,
    `axes: ${axes}`,
    `terrain activation: ${report.terrain.energySignature.activation}`,
    `terrain tension: ${report.terrain.energySignature.tension}`,
    `residual levels: ${report.residualPyramid.levels.length}`,
    `core tags: ${coreTags}`,
    `tagmemo weight: ${report.tagMemo.dynamicTagWeight}`,
    `core weight: ${report.tagMemo.dynamicCoreWeight}`,
    `meta thinking: ${report.metaThinking.auto ? 'auto' : 'off'} score=${report.metaThinking.score} threshold=${report.metaThinking.threshold}`,
    `meta reasons: ${reasons}`,
    `geodesic: ${report.geodesic.willUse ? 'on' : 'off'} alpha=${report.geodesic.alpha} minGeoSamples=${report.geodesic.minGeoSamples}`
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildV8Diagnosis(createConfig(), options.query);
  process.stdout.write(`${options.json ? JSON.stringify(report, null, 2) : renderText(report)}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildV8Diagnosis,
  parseArgs,
  renderText
};
