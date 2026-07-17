'use strict';

const {
  buildLayeredSourceTruthReceipt,
  digestLayeredSourceTruthValue
} = require('./ChatGptWebLayeredSourceTruthReceipt');

class GovernedReadFacade {
  constructor(options = {}) {
    if (typeof options.mcpCall === 'function' || typeof options.toolsCall === 'function') {
      throw new Error('VCP_PUBLIC_TOOL_REENTRANCY_BLOCKED');
    }
    for (const name of ['nativeRecall', 'governanceOverview', 'governanceAudit']) {
      if (typeof options[name] !== 'function') throw new TypeError(`${name} is required`);
    }
    this.nativeRecall = options.nativeRecall;
    this.governanceOverview = options.governanceOverview;
    this.governanceAudit = options.governanceAudit;
    this.clock = typeof options.clock === 'function' ? options.clock : () => new Date().toISOString();
    this.maxWindowMs = Number.isInteger(options.maxWindowMs) ? options.maxWindowMs : 5000;
  }

  async read({ recallInput = {}, overviewInput = {}, auditInput = {}, requestContext = {} } = {}) {
    const observedFrom = this.clock();
    const recall = await this.nativeRecall(recallInput, requestContext);
    const fallbackUsed = recall?.access?.localMemoryFallbackUsed === true ||
      recall?.governedNativeReadFallback?.used === true;
    const nativeAccepted = recall?.accepted === true &&
      recall?.decision !== 'rejected' &&
      recall?.status === 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED';
    if (!nativeAccepted || fallbackUsed) {
      return this._unavailable({ observedFrom, reason: fallbackUsed
        ? 'FALLBACK_NOT_AUTHORIZED'
        : 'VCP_NATIVE_INVOCATION_FAILED' });
    }

    const overview = await this.governanceOverview(overviewInput, requestContext);
    const audit = await this.governanceAudit(auditInput, requestContext);
    const observedTo = this.clock();
    const fromMs = Date.parse(observedFrom);
    const toMs = Date.parse(observedTo);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs - fromMs > this.maxWindowMs) {
      return this._unavailable({ observedFrom, observedTo, reason: 'VCP_COMPOSITE_WINDOW_EXCEEDED' });
    }
    if (!overview || !audit || overview.decision === 'rejected' || audit.decision === 'rejected') {
      return this._unavailable({ observedFrom, observedTo, reason: 'VCP_COMPOSITE_GOVERNANCE_SUBCALL_FAILED' });
    }

    const subReceiptDigests = [recall, overview, audit].map(digestLayeredSourceTruthValue);
    const sourceTruthReceipt = buildLayeredSourceTruthReceipt({
      memoryIntelligenceSource: 'vcp_native',
      fallbackStatus: 'not_used',
      observedFrom,
      observedTo,
      subReceiptDigests,
      providerApiCalls: 0,
      externalNetworkCalls: 0
    });
    return {
      status: sourceTruthReceipt.status === 'candidate' ? 'success' : 'unavailable',
      recall,
      overview,
      audit,
      sourceTruthReceipt,
      aggregateReceiptDigest: sourceTruthReceipt.aggregateReceiptDigest,
      publicMcpReentrancyUsed: false
    };
  }

  _unavailable({ observedFrom, observedTo = observedFrom, reason }) {
    return {
      status: 'unavailable',
      reason,
      publicMcpReentrancyUsed: false,
      sourceTruthReceipt: buildLayeredSourceTruthReceipt({
        memoryIntelligenceSource: 'none',
        fallbackStatus: 'blocked',
        observedFrom,
        observedTo,
        subReceiptDigests: [],
        providerApiCalls: 0,
        externalNetworkCalls: 0
      })
    };
  }
}

module.exports = { GovernedReadFacade };
