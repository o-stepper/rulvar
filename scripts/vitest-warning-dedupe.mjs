// Dedupe repeated RulvarWarnings down to one line per code per run.
//
// The suite deliberately exercises advisory warning paths hundreds of
// times (every InMemoryStore fixture, every bare Date.now determinism
// case), and Node prints each process.emitWarning to stderr, so the
// suite output was ~85 percent duplicate advisory lines. The FIRST
// warning per code still prints, keeping the diagnostic demonstrably
// alive; only exact-code RulvarWarning repeats are swallowed. Cross
// process (the forks pool isolates per test file) the first reporter
// wins an atomic wx file create in a run-scoped memo dir minted by
// vitest.config.ts via ensureRunScopedMemoDir below (and removed when
// the run's main process exits); without that env the dedupe is per
// process only.
//
// Failure discipline (the v1.16.1 review P3): only EEXIST means
// "another worker already reported this code". Any other memo-write
// outcome (ENOENT, EACCES, EROFS, ENOSPC, ...) fails OPEN: the
// diagnostic prints and dedupe degrades to per-process, because losing
// the first warning is worse than repeating it. Memo filenames are the
// sha256 of the warning code, never the raw code, so an arbitrary code
// string cannot address a path outside the memo dir. Everything that is
// not a RulvarWarning with a string code (deprecations, experimental
// warnings, untyped warnings) passes through untouched, and tests that
// assert emission spy on process.emitWarning directly, which layers
// over and restores this wrapper transparently.
//
// This module is side-effect free; vitest-warning-dedupe.setup.mjs is
// the setupFiles entry that installs the wrapper in each worker.
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Memo filename for a warning code: hex sha256, never the raw code. */
export function memoFileName(code) {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Wraps process.emitWarning with the RulvarWarning dedupe. Returns an
 * uninstall function that restores the previous emitter (a no-op when
 * something else has re-wrapped it since, e.g. a test spy).
 */
export function installRulvarWarningDedupe({
  memoDir = process.env.RULVAR_VITEST_WARNING_MEMO_DIR,
  writeMemo = (path) => writeFileSync(path, '', { flag: 'wx' }),
} = {}) {
  const seenRulvarCodes = new Set();
  const previous = process.emitWarning;
  const previousBound = previous.bind(process);

  function firstReporterAcrossWorkers(code) {
    if (memoDir === undefined || memoDir === '') {
      return true;
    }
    try {
      writeMemo(join(memoDir, memoFileName(code)));
      return true;
    } catch (error) {
      if (error !== null && typeof error === 'object' && error.code === 'EEXIST') {
        return false;
      }
      return true;
    }
  }

  const wrapper = (warning, options, ...rest) => {
    const type = typeof options === 'object' && options !== null ? options.type : options;
    const code =
      typeof options === 'object' && options !== null
        ? options.code
        : typeof rest[0] === 'string'
          ? rest[0]
          : undefined;
    const name = warning instanceof Error ? warning.name : type;
    if (name === 'RulvarWarning' && typeof code === 'string') {
      if (seenRulvarCodes.has(code)) {
        return;
      }
      seenRulvarCodes.add(code);
      if (!firstReporterAcrossWorkers(code)) {
        return;
      }
    }
    previousBound(warning, options, ...rest);
  };

  process.emitWarning = wrapper;
  return function uninstall() {
    if (process.emitWarning === wrapper) {
      process.emitWarning = previous;
    }
  };
}

/**
 * Mints the run-scoped memo dir exactly once per run (the main vitest
 * process evaluates the config; workers inherit the env) and removes it
 * when that process exits, so repeated local runs do not accumulate
 * empty tmp dirs. Idempotent: an already-set env wins and registers no
 * second cleanup.
 */
export function ensureRunScopedMemoDir({
  env = process.env,
  mkdtemp = () => mkdtempSync(join(tmpdir(), 'rulvar-vitest-warn-')),
  onExit = (listener) => process.once('exit', listener),
  remove = (dir) => rmSync(dir, { recursive: true, force: true }),
} = {}) {
  const existing = env.RULVAR_VITEST_WARNING_MEMO_DIR;
  if (existing !== undefined && existing !== '') {
    return existing;
  }
  const dir = mkdtemp();
  env.RULVAR_VITEST_WARNING_MEMO_DIR = dir;
  onExit(() => {
    try {
      remove(dir);
    } catch {
      // Exit handlers must never throw; a leftover tmp dir is the
      // acceptable worst case.
    }
  });
  return dir;
}
