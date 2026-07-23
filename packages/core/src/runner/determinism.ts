/**
 * Bare-nondeterminism detection (RV-209): the engine-owned guard that
 * classifies bare `Date.now()`/`Math.random()` calls observed inside a
 * run, localizes workflow-origin ones to a file and line, emits the
 * structured `determinism:warning` event, and under `mode: 'error'`
 * rejects the run with a typed DeterminismError instead of letting a
 * value replay cannot reproduce into the result.
 *
 * The machinery began life inside InProcessRunner (dev-mode process
 * warnings only); it lives here so the engine can thread the run's
 * event channel and the host's DeterminismConfig without touching the
 * frozen ScriptRunner seam: the engine wraps the in-process
 * `runner.execute(...)` call in `withDeterminismDetection`, and the
 * runner itself stays a pure executor.
 *
 * Attribution is by AsyncLocalStorage: only code inside the wrapped
 * execution inherits the detection store, so host code running
 * concurrently, engine internals outside the body, and other runs never
 * false-warn. The globals are patched ONCE per process and never
 * restored (outside a detection context the patch is a transparent
 * passthrough); the previous per-execute patch/restore pair could race
 * under concurrent runs (the false RULVAR_BARE_DATE_NOW class the 1.5.2
 * review reproduced). Rulvar's own internals never reach the check:
 * every internal real-time read binds the module-load clock
 * (l0/real-clock.ts and the ULID factory default), never the live
 * global (v1.18.0 review P2-6).
 */
import { AsyncLocalStorage } from 'node:async_hooks';

import { ConfigError, DeterminismError } from '../l0/errors.js';
import type { DeterminismEvents } from '../l0/events.js';

/**
 * Detection modes. 'off': never detect. 'warn' (the default, and the
 * pre-RV-209 behavior): detect outside production (NODE_ENV !==
 * 'production'), emit one `determinism:warning` event and one process
 * warning per category per segment, never reject. 'error': detect in
 * EVERY environment including production, and reject the run at the
 * first workflow-origin call with a typed DeterminismError (the strict
 * gate for replay-verified pipelines).
 */
export type DeterminismMode = 'off' | 'warn' | 'error';

/** Host configuration for the guard (CreateEngineOptions.determinism). */
export interface DeterminismConfig {
  mode?: DeterminismMode;
  /**
   * Caller frames matching any pattern are exempt by explicit host
   * decision: classified 'allowlisted' in the emitted event, never a
   * process warning, never a rejection. A string matches as a
   * substring of the frame; a RegExp matches by test. Patterns match
   * the RAW frame, before any redaction. Installed dependencies
   * (node_modules) and Node runtime frames (`node:` specifiers) are
   * exempt WITHOUT configuration and emit nothing at all.
   */
  allowlist?: ReadonlyArray<string | RegExp>;
  /**
   * Redaction hook for public telemetry: applied to the frame and the
   * parsed file path before they leave in events, process warnings, and
   * DeterminismError data, so absolute host paths need not reach an
   * OTel backend. Default: identity.
   */
  redact?: (frame: string) => string;
}

interface ResolvedDeterminismConfig {
  mode: DeterminismMode;
  allowlist: ReadonlyArray<string | RegExp>;
  redact: (frame: string) => string;
}

type Category = DeterminismEvents['category'];

interface DetectionState {
  config: ResolvedDeterminismConfig;
  emit: (event: DeterminismEvents) => void;
  /** `${category}:${provenance}` keys already emitted this segment. */
  emitted: Set<string>;
  /**
   * The first error-mode violation: re-thrown after the body settles,
   * so a workflow that caught and swallowed the call-site throw still
   * rejects instead of completing with a nondeterministic value.
   */
  rejection?: DeterminismError;
}

const detection = new AsyncLocalStorage<DetectionState>();
let globalsPatched = false;

const MODES: ReadonlySet<string> = new Set(['off', 'warn', 'error']);

/**
 * Fail-loud validation at engine construction: an invalid mode, a
 * non-function redact hook, or a malformed allowlist entry is a
 * ConfigError before any run can start under it.
 */
export function validateDeterminismConfig(config: DeterminismConfig | undefined): void {
  if (config === undefined) {
    return;
  }
  if (config.mode !== undefined && !MODES.has(config.mode)) {
    throw new ConfigError(
      `determinism.mode must be 'off', 'warn', or 'error'; got '${String(config.mode)}'`,
    );
  }
  if (config.allowlist !== undefined) {
    for (const pattern of config.allowlist) {
      if (typeof pattern !== 'string' && !(pattern instanceof RegExp)) {
        throw new ConfigError(
          'determinism.allowlist entries must be strings (substring match) or RegExp values',
        );
      }
    }
  }
  if (config.redact !== undefined && typeof config.redact !== 'function') {
    throw new ConfigError('determinism.redact must be a function (frame: string) => string');
  }
}

function resolveConfig(config: DeterminismConfig | undefined): ResolvedDeterminismConfig {
  return {
    mode: config?.mode ?? 'warn',
    allowlist: config?.allowlist ?? [],
    redact: config?.redact ?? ((frame: string): string => frame),
  };
}

/**
 * The trailing `path:line:column` of a V8 stack frame, in both layouts:
 * `at fn (/abs/path.ts:12:5)` and `at file:///abs/path.ts:12:5`. Frames
 * without one (native frames, nested eval) yield undefined and the
 * event carries the frame string alone.
 */
const FRAME_LOCATION = /(?:\(|at\s)([^()]+):(\d+):(\d+)\)?\s*$/;

function parseFrameLocation(
  frame: string,
): { file: string; line: number; column: number } | undefined {
  const match = FRAME_LOCATION.exec(frame);
  if (match === null) {
    return undefined;
  }
  // A loader's cache-busting query (`wf.mjs?mtime=...`) is an artifact
  // of how the module was imported, not part of where the code lives;
  // the raw frame keeps it, the parsed file does not.
  return { file: match[1].replace(/\?.*$/, ''), line: Number(match[2]), column: Number(match[3]) };
}

function matchesAllowlist(frame: string, allowlist: ReadonlyArray<string | RegExp>): boolean {
  return allowlist.some((pattern) =>
    typeof pattern === 'string' ? frame.includes(pattern) : pattern.test(frame),
  );
}

/**
 * Stack line 0 names the Error, line 1 this observer, line 2 the patched
 * global, line 3 the caller whose provenance decides (the layout is
 * pinned by construction: the observer is only ever called by the two
 * patched globals). Two origins are exempt without configuration:
 * installed dependencies (a provider SDK, any transitive package,
 * rulvar's own published dist), which live under node_modules, and
 * Node's own machinery (the undici transport behind fetch, timers,
 * stream internals), whose frames carry `node:` specifiers and inherit
 * the run's async context. The guard exists for workflow code, which
 * imports from both but lives in neither.
 */
function observeBareCall(category: Category): void {
  const state = detection.getStore();
  if (state === undefined) {
    return;
  }
  const caller = new Error().stack?.split('\n')[3];
  if (caller === undefined) {
    return;
  }
  if (caller.includes('node_modules') || /[(\s]node:/.test(caller)) {
    // Dependency / runtime provenance: classified exempt, fully silent.
    return;
  }
  const frame = caller.trim();
  const provenance: DeterminismEvents['provenance'] = matchesAllowlist(
    frame,
    state.config.allowlist,
  )
    ? 'allowlisted'
    : 'workflow';
  const location = parseFrameLocation(frame);
  const redact = state.config.redact;
  const redactedFile = location === undefined ? undefined : redact(location.file);
  const dedupeKey = `${category}:${provenance}`;
  if (!state.emitted.has(dedupeKey)) {
    state.emitted.add(dedupeKey);
    state.emit({
      type: 'determinism:warning',
      category,
      provenance,
      frame: redact(frame),
      ...(location === undefined || redactedFile === undefined
        ? {}
        : { file: redactedFile, line: location.line, column: location.column }),
    });
    if (provenance === 'workflow' && state.config.mode === 'warn') {
      const globalName = category === 'bare-date-now' ? 'Date.now()' : 'Math.random()';
      const shim = category === 'bare-date-now' ? 'ctx.now()' : 'ctx.random()';
      const at =
        location === undefined ? '' : ` at ${redactedFile}:${location.line}:${location.column}`;
      process.emitWarning(
        `bare ${globalName} called inside a rulvar run${at}; use ${shim} so the value is ` +
          'journaled and stable on replay',
        {
          code: category === 'bare-date-now' ? 'RULVAR_BARE_DATE_NOW' : 'RULVAR_BARE_MATH_RANDOM',
          type: 'RulvarWarning',
        },
      );
    }
  }
  if (provenance === 'workflow' && state.config.mode === 'error') {
    // EVERY workflow-origin call throws in error mode (the event above
    // is emitted once): a workflow that swallowed the first throw does
    // not get a free pass on the next call, and the settle backstop
    // below rejects the run regardless.
    const globalName = category === 'bare-date-now' ? 'Date.now()' : 'Math.random()';
    const at =
      location === undefined ? '' : ` at ${redactedFile}:${location.line}:${location.column}`;
    const error = new DeterminismError(
      `bare ${globalName} called inside a rulvar run${at} under determinism.mode 'error'; ` +
        `use ${category === 'bare-date-now' ? 'ctx.now()' : 'ctx.random()'} or allowlist the frame`,
      {
        data: {
          category,
          frame: redact(frame),
          ...(location === undefined || redactedFile === undefined
            ? {}
            : { file: redactedFile, line: location.line, column: location.column }),
        },
      },
    );
    state.rejection ??= error;
    throw error;
  }
}

/**
 * Patches Date.now and Math.random ONCE per process and never restores:
 * outside a detection context the store is absent and the patch is a
 * transparent passthrough.
 */
function patchGlobalsOnce(): void {
  if (globalsPatched) {
    return;
  }
  globalsPatched = true;
  const priorNow = Date.now;
  const priorRandom = Math.random;
  Date.now = function rulvarPatchedDateNow(): number {
    observeBareCall('bare-date-now');
    return priorNow();
  };
  Math.random = function rulvarPatchedMathRandom(): number {
    observeBareCall('bare-math-random');
    return priorRandom();
  };
}

/**
 * Runs `fn` (the in-process execution of a workflow body) under
 * bare-nondeterminism detection. Detection is active for mode 'warn'
 * outside production and for mode 'error' everywhere; otherwise `fn`
 * runs untouched with zero overhead. In error mode, a workflow-origin
 * violation swallowed by the body is re-thrown after the body settles,
 * so the segment rejects either way.
 */
export function withDeterminismDetection<T>(
  config: DeterminismConfig | undefined,
  emit: (event: DeterminismEvents) => void,
  fn: () => Promise<T>,
): Promise<T> {
  const resolved = resolveConfig(config);
  const active =
    resolved.mode === 'error' ||
    (resolved.mode === 'warn' && process.env.NODE_ENV !== 'production');
  if (!active) {
    return fn();
  }
  patchGlobalsOnce();
  const state: DetectionState = { config: resolved, emit, emitted: new Set() };
  return detection.run(state, fn).then((result) => {
    if (state.rejection !== undefined) {
      throw state.rejection;
    }
    return result;
  });
}
