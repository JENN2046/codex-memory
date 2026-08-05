'use strict';

const fs = require('node:fs');

const DECISIONS = Object.freeze({
  IGNORE: 'IGNORE_DEFINITIVELY_UNRELATED',
  FAIL_CLOSED: 'FAIL_CLOSED_PLAUSIBLE_OR_UNKNOWN',
  EXACT: 'EXACT_MANAGED_MATCH'
});

const COMMAND_SHAPES = Object.freeze({
  DEFINITIVELY_UNRELATED: 'DEFINITIVELY_UNRELATED',
  MANAGED_SHAPE: 'MANAGED_SHAPE',
  AMBIGUOUS: 'AMBIGUOUS'
});

const OWNER_STATES = Object.freeze({
  SAME_OWNER: 'SAME_OWNER',
  FOREIGN_OWNER: 'FOREIGN_OWNER',
  UNKNOWN: 'UNKNOWN'
});

const EVIDENCE_STATUS = Object.freeze({
  RESOLVED: 'RESOLVED',
  UNAVAILABLE: 'UNAVAILABLE',
  READABLE: 'READABLE',
  UNREADABLE: 'UNREADABLE',
  NOT_READ: 'NOT_READ',
  VALID: 'VALID',
  INVALID: 'INVALID'
});

const LIVENESS_STATES = Object.freeze({
  RUNNING: 'RUNNING',
  NOT_RUNNING: 'NOT_RUNNING',
  UNKNOWN: 'UNKNOWN'
});

function parsePid(value) {
  const normalized = String(value || '').trim();
  if (!/^[1-9][0-9]{0,9}$/u.test(normalized)) return null;
  const pid = Number(normalized);
  return Number.isSafeInteger(pid) && pid > 1 ? pid : null;
}

function isAbsolutePath(value) {
  return typeof value === 'string' && value.length > 0 &&
    value.includes('\0') === false && value.startsWith('/');
}

function isStringArray(value) {
  return Array.isArray(value) && value.length > 0 &&
    value.every(item => typeof item === 'string' && !item.includes('\0'));
}

function normalizeLivenessState(value) {
  if (value === true || value === LIVENESS_STATES.RUNNING) {
    return LIVENESS_STATES.RUNNING;
  }
  if (value === false || value === LIVENESS_STATES.NOT_RUNNING) {
    return LIVENESS_STATES.NOT_RUNNING;
  }
  return LIVENESS_STATES.UNKNOWN;
}

function normalizeShape(value) {
  return Object.values(COMMAND_SHAPES).includes(value)
    ? value
    : COMMAND_SHAPES.AMBIGUOUS;
}

function classifyManagedCommandShape(argv, {
  matchComponents,
  hasManagedShapeHint = () => false
} = {}) {
  if (!isStringArray(argv) || typeof matchComponents !== 'function') {
    return COMMAND_SHAPES.AMBIGUOUS;
  }
  let matches;
  try {
    matches = matchComponents(argv);
  } catch {
    return COMMAND_SHAPES.AMBIGUOUS;
  }
  if (matches === true) return COMMAND_SHAPES.MANAGED_SHAPE;
  if (Array.isArray(matches)) {
    if (matches.length === 1) return COMMAND_SHAPES.MANAGED_SHAPE;
    if (matches.length > 1) return COMMAND_SHAPES.AMBIGUOUS;
  } else if (matches !== false) {
    return normalizeShape(matches);
  }
  try {
    return hasManagedShapeHint(argv)
      ? COMMAND_SHAPES.AMBIGUOUS
      : COMMAND_SHAPES.DEFINITIVELY_UNRELATED;
  } catch {
    return COMMAND_SHAPES.AMBIGUOUS;
  }
}

function decision(decisionValue, reason, component = null) {
  return Object.freeze({
    decision: decisionValue,
    reason,
    component
  });
}

function classifyManagedProcessEvidence(evidence, {
  runtimeRepository,
  commandShape = COMMAND_SHAPES.AMBIGUOUS,
  exactComponent = null,
  controllerSelf = false
} = {}) {
  if (!evidence || typeof evidence !== 'object' ||
      !isAbsolutePath(runtimeRepository)) {
    return decision(DECISIONS.FAIL_CLOSED, 'OBSERVATION_UNAVAILABLE');
  }
  if (evidence.liveness === LIVENESS_STATES.NOT_RUNNING ||
      evidence.disappeared === true) {
    return decision(
      DECISIONS.IGNORE,
      evidence.disappeared ? 'PROCESS_DISAPPEARED' : 'PROCESS_NOT_RUNNING'
    );
  }
  if (controllerSelf) {
    return decision(DECISIONS.IGNORE, 'CONTROLLER_SELF');
  }
  if (evidence.owner?.status === OWNER_STATES.FOREIGN_OWNER) {
    return decision(DECISIONS.IGNORE, 'FOREIGN_OWNER');
  }
  if (evidence.liveness !== LIVENESS_STATES.RUNNING ||
      evidence.owner?.status !== OWNER_STATES.SAME_OWNER) {
    return decision(DECISIONS.FAIL_CLOSED, 'OBSERVATION_UNAVAILABLE');
  }
  if (evidence.cwd?.status === EVIDENCE_STATUS.READABLE &&
      evidence.cwd.path !== runtimeRepository) {
    return decision(DECISIONS.IGNORE, 'CWD_OUTSIDE_RUNTIME_REPOSITORY');
  }
  if (evidence.canonicalNode?.status === EVIDENCE_STATUS.RESOLVED &&
      evidence.executable?.status === EVIDENCE_STATUS.READABLE &&
      evidence.executable.path !== evidence.canonicalNode.path) {
    return decision(DECISIONS.IGNORE, 'EXECUTABLE_NOT_CANONICAL_NODE');
  }
  if (evidence.command?.status !== EVIDENCE_STATUS.READABLE ||
      !isStringArray(evidence.command.argv)) {
    return decision(DECISIONS.FAIL_CLOSED, 'COMMAND_UNAVAILABLE');
  }
  const identityComplete =
    evidence.canonicalNode?.status === EVIDENCE_STATUS.RESOLVED &&
    evidence.executable?.status === EVIDENCE_STATUS.READABLE &&
    evidence.executable.path === evidence.canonicalNode.path &&
    evidence.cwd?.status === EVIDENCE_STATUS.READABLE &&
    evidence.cwd.path === runtimeRepository;
  if (identityComplete) {
    if (typeof exactComponent !== 'string' || exactComponent.length === 0) {
      return decision(DECISIONS.IGNORE, 'COMPLETE_IDENTITY_NONMATCH');
    }
    if (evidence.startIdentity?.status !== EVIDENCE_STATUS.VALID) {
      return decision(DECISIONS.FAIL_CLOSED, 'START_IDENTITY_UNAVAILABLE');
    }
    return decision(
      DECISIONS.EXACT,
      'EXACT_COMPONENT_IDENTITY',
      exactComponent
    );
  }
  if (commandShape === COMMAND_SHAPES.DEFINITIVELY_UNRELATED) {
    return decision(DECISIONS.IGNORE, 'COMMAND_SHAPE_NONMATCH');
  }
  return decision(
    DECISIONS.FAIL_CLOSED,
    commandShape === COMMAND_SHAPES.MANAGED_SHAPE
      ? 'MANAGED_SHAPE_IDENTITY_INCOMPLETE'
      : 'COMMAND_SHAPE_AMBIGUOUS'
  );
}

function privateProcessIO(adapter = {}) {
  const fsModule = adapter.fsModule || fs;
  const kill = typeof adapter.kill === 'function'
    ? adapter.kill
    : process.kill.bind(process);
  const ownerUid = Number.isSafeInteger(adapter.ownerUid)
    ? adapter.ownerUid
    : typeof process.getuid === 'function' ? process.getuid() : null;
  const execPath = typeof adapter.execPath === 'string'
    ? adapter.execPath
    : process.execPath;
  return Object.freeze({
    execPath,
    resolveCanonicalNode: typeof adapter.resolveCanonicalNode === 'function'
      ? adapter.resolveCanonicalNode
      : value => fsModule.realpathSync(value),
    enumerateProcessIds: typeof adapter.enumerateProcessIds === 'function'
      ? adapter.enumerateProcessIds
      : () => fsModule.readdirSync('/proc')
        .map(entry => parsePid(typeof entry === 'string' ? entry : entry?.name))
        .filter(pid => pid !== null),
    readLiveness: typeof adapter.readLiveness === 'function'
      ? adapter.readLiveness
      : pid => {
        if (parsePid(pid) === null) return LIVENESS_STATES.UNKNOWN;
        try {
          kill(pid, 0);
          return LIVENESS_STATES.RUNNING;
        } catch (error) {
          if (error?.code === 'EPERM') return LIVENESS_STATES.RUNNING;
          if (error?.code === 'ESRCH') return LIVENESS_STATES.NOT_RUNNING;
          return LIVENESS_STATES.UNKNOWN;
        }
      },
    readOwner: typeof adapter.readOwner === 'function'
      ? adapter.readOwner
      : pid => {
        if (!Number.isSafeInteger(ownerUid)) return OWNER_STATES.UNKNOWN;
        try {
          return fsModule.statSync(`/proc/${pid}`).uid === ownerUid
            ? OWNER_STATES.SAME_OWNER
            : OWNER_STATES.FOREIGN_OWNER;
        } catch {
          return OWNER_STATES.UNKNOWN;
        }
      },
    readExecutable: typeof adapter.readExecutable === 'function'
      ? adapter.readExecutable
      : pid => {
        try {
          return fsModule.realpathSync(`/proc/${pid}/exe`);
        } catch {
          return null;
        }
      },
    readCwd: typeof adapter.readCwd === 'function'
      ? adapter.readCwd
      : pid => {
        try {
          return fsModule.realpathSync(`/proc/${pid}/cwd`);
        } catch {
          return null;
        }
      },
    readCommandLine: typeof adapter.readCommandLine === 'function'
      ? adapter.readCommandLine
      : pid => {
        try {
          const value = fsModule.readFileSync(`/proc/${pid}/cmdline`);
          const argv = value.toString('utf8').split('\0').filter(Boolean);
          return argv.length > 0 ? argv : null;
        } catch {
          return null;
        }
      },
    readStartIdentity: typeof adapter.readStartIdentity === 'function'
      ? adapter.readStartIdentity
      : pid => {
        try {
          const value = fsModule.readFileSync(`/proc/${pid}/stat`, 'utf8');
          if (typeof value !== 'string' || value.length > 16_384) return null;
          const closing = value.lastIndexOf(') ');
          if (!value.startsWith(`${pid} (`) || closing < 3) return null;
          const startTicks = value.slice(closing + 2).trim().split(/\s+/u)[19];
          return /^[1-9][0-9]{0,39}$/u.test(startTicks || '')
            ? startTicks
            : null;
        } catch {
          return null;
        }
      }
  });
}

function safeRead(reader, pid, fallback) {
  try {
    return reader(pid);
  } catch {
    return fallback;
  }
}

function readLiveness(io, pid) {
  return normalizeLivenessState(
    safeRead(io.readLiveness, pid, LIVENESS_STATES.UNKNOWN)
  );
}

function normalizeOwner(value) {
  if (value === OWNER_STATES.SAME_OWNER || value === true) {
    return OWNER_STATES.SAME_OWNER;
  }
  if (value === OWNER_STATES.FOREIGN_OWNER || value === false) {
    return OWNER_STATES.FOREIGN_OWNER;
  }
  return OWNER_STATES.UNKNOWN;
}

function normalizePath(value) {
  if (value?.status === EVIDENCE_STATUS.READABLE &&
      isAbsolutePath(value.path)) {
    return Object.freeze({ status: EVIDENCE_STATUS.READABLE, path: value.path });
  }
  return isAbsolutePath(value)
    ? Object.freeze({ status: EVIDENCE_STATUS.READABLE, path: value })
    : Object.freeze({ status: EVIDENCE_STATUS.UNREADABLE, path: null });
}

function normalizeCommand(value) {
  const argv = value?.status === EVIDENCE_STATUS.READABLE
    ? value.argv
    : value;
  return isStringArray(argv)
    ? Object.freeze({
      status: EVIDENCE_STATUS.READABLE,
      argv: Object.freeze([...argv])
    })
    : Object.freeze({ status: EVIDENCE_STATUS.UNREADABLE, argv: null });
}

function normalizeStartIdentity(value) {
  const candidate = value?.status === EVIDENCE_STATUS.VALID
    ? value.value
    : value;
  if (typeof candidate === 'string' &&
      /^[1-9][0-9]{0,39}$/u.test(candidate)) {
    return Object.freeze({ status: EVIDENCE_STATUS.VALID, value: candidate });
  }
  return Object.freeze({ status: EVIDENCE_STATUS.UNAVAILABLE, value: null });
}

function baseEvidence(pid, canonicalNode) {
  return {
    pid,
    liveness: LIVENESS_STATES.UNKNOWN,
    disappeared: false,
    owner: { status: OWNER_STATES.UNKNOWN },
    canonicalNode,
    executable: { status: EVIDENCE_STATUS.UNREADABLE, path: null },
    cwd: { status: EVIDENCE_STATUS.UNREADABLE, path: null },
    command: { status: EVIDENCE_STATUS.NOT_READ, argv: null },
    startIdentity: { status: EVIDENCE_STATUS.NOT_READ, value: null }
  };
}

function collectProcessEvidence(pid, {
  io,
  canonicalNode,
  runtimeRepository,
  controllerPid,
  classifyCommandShape,
  exactComponentMatcher
}) {
  const evidence = baseEvidence(pid, canonicalNode);
  if (pid === controllerPid) {
    return decision(DECISIONS.IGNORE, 'CONTROLLER_SELF');
  }
  evidence.liveness = readLiveness(io, pid);
  if (evidence.liveness !== LIVENESS_STATES.RUNNING) {
    evidence.disappeared = evidence.liveness === LIVENESS_STATES.NOT_RUNNING;
    return classifyManagedProcessEvidence(evidence, { runtimeRepository });
  }
  evidence.owner = { status: normalizeOwner(safeRead(io.readOwner, pid, null)) };
  if (evidence.owner.status !== OWNER_STATES.SAME_OWNER) {
    if (evidence.owner.status === OWNER_STATES.UNKNOWN) {
      const state = readLiveness(io, pid);
      if (state === LIVENESS_STATES.NOT_RUNNING) {
        evidence.liveness = state;
        evidence.disappeared = true;
      } else if (state === LIVENESS_STATES.UNKNOWN) {
        evidence.liveness = state;
      }
    }
    return classifyManagedProcessEvidence(evidence, { runtimeRepository });
  }
  evidence.executable = normalizePath(safeRead(io.readExecutable, pid, null));
  evidence.cwd = normalizePath(safeRead(io.readCwd, pid, null));
  const afterMinimal = readLiveness(io, pid);
  if (afterMinimal !== LIVENESS_STATES.RUNNING) {
    evidence.liveness = afterMinimal;
    evidence.disappeared = afterMinimal === LIVENESS_STATES.NOT_RUNNING;
    return classifyManagedProcessEvidence(evidence, { runtimeRepository });
  }
  if (evidence.cwd.status === EVIDENCE_STATUS.READABLE &&
      evidence.cwd.path !== runtimeRepository) {
    return classifyManagedProcessEvidence(evidence, { runtimeRepository });
  }
  if (canonicalNode.status === EVIDENCE_STATUS.RESOLVED &&
      evidence.executable.status === EVIDENCE_STATUS.READABLE &&
      evidence.executable.path !== canonicalNode.path) {
    return classifyManagedProcessEvidence(evidence, { runtimeRepository });
  }
  evidence.command = normalizeCommand(safeRead(io.readCommandLine, pid, null));
  const afterCommand = readLiveness(io, pid);
  if (afterCommand !== LIVENESS_STATES.RUNNING) {
    evidence.liveness = afterCommand;
    evidence.disappeared = afterCommand === LIVENESS_STATES.NOT_RUNNING;
    return classifyManagedProcessEvidence(evidence, { runtimeRepository });
  }
  if (evidence.command.status !== EVIDENCE_STATUS.READABLE) {
    return classifyManagedProcessEvidence(evidence, { runtimeRepository });
  }
  let commandShape = COMMAND_SHAPES.AMBIGUOUS;
  try {
    commandShape = normalizeShape(classifyCommandShape(
      evidence.command.argv,
      { canonicalNode, evidence: { ...evidence } }
    ));
  } catch {}
  const identityComplete =
    canonicalNode.status === EVIDENCE_STATUS.RESOLVED &&
    evidence.executable.status === EVIDENCE_STATUS.READABLE &&
    evidence.executable.path === canonicalNode.path &&
    evidence.cwd.status === EVIDENCE_STATUS.READABLE &&
    evidence.cwd.path === runtimeRepository;
  let exactComponent = null;
  if (identityComplete && commandShape !== COMMAND_SHAPES.DEFINITIVELY_UNRELATED) {
    try {
      exactComponent = exactComponentMatcher(
        evidence.command.argv,
        { canonicalNode, evidence: { ...evidence } }
      );
    } catch {
      return decision(DECISIONS.FAIL_CLOSED, 'EXACT_MATCH_UNAVAILABLE');
    }
  }
  if (exactComponent) {
    evidence.startIdentity = normalizeStartIdentity(
      safeRead(io.readStartIdentity, pid, null)
    );
  }
  return classifyManagedProcessEvidence(evidence, {
    runtimeRepository,
    commandShape,
    exactComponent
  });
}

function canonicalNodeSnapshot(io) {
  try {
    const resolved = io.resolveCanonicalNode(io.execPath);
    if (!isAbsolutePath(resolved)) throw new Error('unavailable');
    return Object.freeze({ status: EVIDENCE_STATUS.RESOLVED, path: resolved });
  } catch {
    return Object.freeze({ status: EVIDENCE_STATUS.UNAVAILABLE, path: null });
  }
}

function finalizeScan({
  decision: value,
  reason,
  componentMatches = [],
  canonicalNode
}) {
  return Object.freeze({
    decision: value,
    reason,
    componentMatches: Object.freeze(componentMatches.map(match =>
      Object.freeze({ pid: match.pid, component: match.component })
    )),
    canonicalNodeStatus: canonicalNode.status
  });
}

function normalizeKnownPids(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result = new Map();
  for (const [component, candidate] of Object.entries(value)) {
    if (candidate === null) continue;
    const pid = parsePid(candidate);
    if (pid === null || typeof component !== 'string' || !component) return null;
    if (!result.has(pid)) result.set(pid, []);
    result.get(pid).push(component);
  }
  return result;
}

function scanManagedProcesses({
  runtimeRepository,
  controllerPid = process.pid,
  knownPidsByComponent = {},
  processIOAdapter,
  classifyCommandShape,
  exactComponentMatcher
} = {}) {
  const io = privateProcessIO(processIOAdapter);
  const canonicalNode = canonicalNodeSnapshot(io);
  const knownPids = normalizeKnownPids(knownPidsByComponent);
  if (!isAbsolutePath(runtimeRepository) || knownPids === null ||
      typeof classifyCommandShape !== 'function' ||
      typeof exactComponentMatcher !== 'function') {
    return finalizeScan({
      decision: DECISIONS.FAIL_CLOSED,
      reason: 'OBSERVER_CONTRACT_INVALID',
      canonicalNode
    });
  }
  let enumerated;
  try {
    enumerated = io.enumerateProcessIds();
  } catch {
    return finalizeScan({
      decision: DECISIONS.FAIL_CLOSED,
      reason: 'PROCESS_ENUMERATION_UNAVAILABLE',
      canonicalNode
    });
  }
  if (!Array.isArray(enumerated)) {
    return finalizeScan({
      decision: DECISIONS.FAIL_CLOSED,
      reason: 'PROCESS_ENUMERATION_UNAVAILABLE',
      canonicalNode
    });
  }
  const pids = new Set();
  for (const candidate of enumerated) {
    const pid = parsePid(candidate);
    if (pid !== null) pids.add(pid);
  }
  for (const pid of knownPids.keys()) pids.add(pid);
  const matches = [];
  for (const pid of pids) {
    if (knownPids.has(pid)) {
      const state = readLiveness(io, pid);
      if (state === LIVENESS_STATES.RUNNING) {
        return finalizeScan({
          decision: DECISIONS.FAIL_CLOSED,
          reason: 'KNOWN_PID_RUNNING',
          canonicalNode
        });
      }
      if (state === LIVENESS_STATES.UNKNOWN) {
        return finalizeScan({
          decision: DECISIONS.FAIL_CLOSED,
          reason: 'KNOWN_PID_LIVENESS_UNKNOWN',
          canonicalNode
        });
      }
      continue;
    }
    const observed = collectProcessEvidence(pid, {
      io,
      canonicalNode,
      runtimeRepository,
      controllerPid,
      classifyCommandShape,
      exactComponentMatcher
    });
    if (observed.decision === DECISIONS.FAIL_CLOSED) {
      return finalizeScan({
        decision: observed.decision,
        reason: observed.reason,
        canonicalNode
      });
    }
    if (observed.decision === DECISIONS.EXACT) {
      matches.push({ pid, component: observed.component });
    }
  }
  return finalizeScan({
    decision: matches.length > 0 ? DECISIONS.EXACT : DECISIONS.IGNORE,
    reason: matches.length > 0 ? 'EXACT_COMPONENT_IDENTITY' : 'NO_MANAGED_MATCH',
    componentMatches: matches,
    canonicalNode
  });
}

module.exports = {
  COMMAND_SHAPES,
  DECISIONS,
  EVIDENCE_STATUS,
  OWNER_STATES,
  LIVENESS_STATES,
  classifyManagedCommandShape,
  classifyManagedProcessEvidence,
  scanManagedProcesses
};
