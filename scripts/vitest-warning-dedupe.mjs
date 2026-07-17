// Vitest setup: dedupe repeated RulvarWarnings down to one per run.
//
// The suite deliberately exercises advisory warning paths hundreds of
// times (every InMemoryStore fixture, every bare Date.now determinism
// case), and Node prints each process.emitWarning to stderr, so the
// suite output was ~85 percent duplicate advisory lines. The FIRST
// warning per code still prints, keeping the diagnostic demonstrably
// alive; only exact-code RulvarWarning repeats are swallowed. Cross
// process (the forks pool isolates per test file) the first reporter
// wins an atomic wx file create in a run-scoped memo dir minted by
// vitest.config.ts; without that env the dedupe is per process only.
// Everything else (deprecations, experimental warnings, any warning
// without our type) passes through untouched, and tests that assert
// emission spy on process.emitWarning directly, which layers over and
// restores this wrapper transparently.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const memoDir = process.env.RULVAR_VITEST_WARNING_MEMO_DIR;
const seenRulvarCodes = new Set();
const originalEmitWarning = process.emitWarning.bind(process);

function firstReporterAcrossWorkers(code) {
  if (memoDir === undefined || memoDir === '') {
    return true;
  }
  try {
    writeFileSync(join(memoDir, code), '', { flag: 'wx' });
    return true;
  } catch {
    return false;
  }
}

process.emitWarning = (warning, options, ...rest) => {
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
  originalEmitWarning(warning, options, ...rest);
};
