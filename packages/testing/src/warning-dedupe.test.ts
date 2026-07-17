/**
 * Adversarial coverage for the repo-level RulvarWarning dedupe
 * (scripts/vitest-warning-dedupe.mjs), the v1.16.1 review P3: the
 * wrapper must fail OPEN on every memo-write outcome except EEXIST
 * (losing the first diagnostic is worse than repeating it), must never
 * use a raw warning code as a filesystem path, must leave every
 * non-Rulvar warning untouched, and must remove its run-scoped memo dir
 * on exit. The suite runs with the real wrapper installed by
 * setupFiles; each case layers its own instance over a local spy and
 * restores, exactly how warning-asserting tests interact with it.
 */
import { existsSync, mkdtempSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ensureRunScopedMemoDir,
  installRulvarWarningDedupe,
  memoFileName,
} from '../../../scripts/vitest-warning-dedupe.mjs';

type InstallOptions = Parameters<typeof installRulvarWarningDedupe>[0];

/**
 * Replaces process.emitWarning with a recording spy, hands the case an
 * installer that layers dedupe instances over it, and restores
 * everything afterwards regardless of outcome.
 */
function withSpy(
  run: (emitted: unknown[][], install: (options?: InstallOptions) => () => void) => void,
): void {
  // eslint-disable-next-line @typescript-eslint/unbound-method -- stored and restored by value, never invoked through this reference
  const original = process.emitWarning;
  const emitted: unknown[][] = [];
  process.emitWarning = (...args: unknown[]) => {
    emitted.push(args);
  };
  const uninstalls: Array<() => void> = [];
  try {
    run(emitted, (options) => {
      const uninstall = installRulvarWarningDedupe(options);
      uninstalls.push(uninstall);
      return uninstall;
    });
  } finally {
    for (const uninstall of uninstalls.reverse()) {
      uninstall();
    }
    process.emitWarning = original;
  }
}

function rulvar(code: string): void {
  process.emitWarning('advisory', { type: 'RulvarWarning', code });
}

describe('vitest warning dedupe (v1.16.1 review P3)', () => {
  it('dedupes per process without a memo dir', () => {
    withSpy((emitted, install) => {
      install({ memoDir: '' });
      rulvar('RUL_IN_PROCESS');
      rulvar('RUL_IN_PROCESS');
      expect(emitted).toHaveLength(1);
    });
  });

  it('lets the first reporter across workers through and suppresses the second', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-dedupe-cross-'));
    withSpy((emitted, install) => {
      const first = install({ memoDir: dir });
      rulvar('RUL_CROSS');
      first();
      // A fresh install simulates a second worker: empty in-process
      // set, same memo dir, so only the wx EEXIST suppresses.
      install({ memoDir: dir });
      rulvar('RUL_CROSS');
      expect(emitted).toHaveLength(1);
    });
  });

  it('treats exactly EEXIST as already reported', () => {
    withSpy((emitted, install) => {
      install({
        memoDir: '/never/consulted',
        writeMemo: () => {
          const error: NodeJS.ErrnoException = new Error('memo exists');
          error.code = 'EEXIST';
          throw error;
        },
      });
      rulvar('RUL_EEXIST');
      expect(emitted).toHaveLength(0);
    });
  });

  it('fails open when the memo dir does not exist', () => {
    const missing = join(tmpdir(), 'rulvar-dedupe-missing', 'nested', 'deeper');
    withSpy((emitted, install) => {
      install({ memoDir: missing });
      rulvar('RUL_ENOENT');
      expect(emitted).toHaveLength(1);
      // Dedupe degrades to per-process instead of disappearing.
      rulvar('RUL_ENOENT');
      expect(emitted).toHaveLength(1);
    });
  });

  it('fails open when the memo dir path is not a directory', () => {
    const parent = mkdtempSync(join(tmpdir(), 'rulvar-dedupe-notdir-'));
    const filePath = join(parent, 'occupied');
    writeFileSync(filePath, '');
    withSpy((emitted, install) => {
      install({ memoDir: filePath });
      rulvar('RUL_ENOTDIR');
      expect(emitted).toHaveLength(1);
    });
  });

  it('fails open on synthetic ENOSPC and on codeless write errors', () => {
    for (const thrown of [
      Object.assign(new Error('disk full'), { code: 'ENOSPC' }),
      new Error('generic failure'),
    ]) {
      withSpy((emitted, install) => {
        install({
          memoDir: '/never/consulted',
          writeMemo: () => {
            throw thrown;
          },
        });
        rulvar('RUL_FAIL_OPEN');
        expect(emitted).toHaveLength(1);
      });
    }
  });

  it('never touches non-Rulvar warnings or the memo dir for them', () => {
    withSpy((emitted, install) => {
      let memoWrites = 0;
      install({
        memoDir: '/never/consulted',
        writeMemo: () => {
          memoWrites += 1;
        },
      });
      process.emitWarning('exp', { type: 'ExperimentalWarning', code: 'EXP01' });
      process.emitWarning('exp', { type: 'ExperimentalWarning', code: 'EXP01' });
      process.emitWarning('dep', 'DeprecationWarning', 'DEP01');
      process.emitWarning('dep', 'DeprecationWarning', 'DEP01');
      process.emitWarning('plain untyped warning');
      process.emitWarning('plain untyped warning');
      // A RulvarWarning without a string code also passes untouched.
      process.emitWarning('no code', { type: 'RulvarWarning' });
      process.emitWarning('no code', { type: 'RulvarWarning' });
      expect(emitted).toHaveLength(8);
      expect(memoWrites).toBe(0);
    });
  });

  it('shows each distinct RulvarWarning code exactly once', () => {
    withSpy((emitted, install) => {
      install({ memoDir: '' });
      rulvar('RUL_A');
      rulvar('RUL_B');
      rulvar('RUL_A');
      rulvar('RUL_B');
      expect(emitted).toHaveLength(2);
      expect(emitted.map((args) => (args[1] as { code: string }).code)).toEqual([
        'RUL_A',
        'RUL_B',
      ]);
    });
  });

  it('hashes hostile codes so no memo file lands outside the dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-dedupe-hash-'));
    const hostile = ['../../escape', 'nested/inside', '..', 'код☂', 'a\\b'];
    withSpy((_emitted, install) => {
      install({ memoDir: dir });
      for (const code of hostile) {
        process.emitWarning('advisory', { type: 'RulvarWarning', code });
      }
    });
    const names = readdirSync(dir);
    expect(names).toHaveLength(hostile.length);
    for (const name of names) {
      expect(name).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(existsSync(join(dirname(dir), 'escape'))).toBe(false);
    for (const code of hostile) {
      expect(memoFileName(code)).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('preserves both documented emitWarning forms verbatim when passing through', () => {
    withSpy((emitted, install) => {
      install({ memoDir: '' });
      const error = new Error('typed advisory');
      error.name = 'RulvarWarning';
      const options = { code: 'RUL_ERROR_FORM' };
      process.emitWarning(error, options);
      process.emitWarning(error, options);
      const ctor = (): void => {};
      process.emitWarning('string advisory', 'RulvarWarning', 'RUL_STRING_FORM', ctor);
      process.emitWarning('string advisory', 'RulvarWarning', 'RUL_STRING_FORM', ctor);
      expect(emitted).toHaveLength(2);
      expect(emitted[0]?.[0]).toBe(error);
      expect(emitted[0]?.[1]).toBe(options);
      expect(emitted[1]).toEqual(['string advisory', 'RulvarWarning', 'RUL_STRING_FORM', ctor]);
    });
  });

  it('mints the run-scoped memo dir once and removes it on exit', () => {
    const env: Record<string, string | undefined> = {};
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-dedupe-ensure-'));
    let exitListener: (() => void) | undefined;
    const minted = ensureRunScopedMemoDir({
      env,
      mkdtemp: () => dir,
      onExit: (listener) => {
        exitListener = listener;
      },
    });
    expect(minted).toBe(dir);
    expect(env.RULVAR_VITEST_WARNING_MEMO_DIR).toBe(dir);
    const again = ensureRunScopedMemoDir({
      env,
      mkdtemp: () => {
        throw new Error('must not mint twice');
      },
      onExit: () => {
        throw new Error('must not register a second cleanup');
      },
    });
    expect(again).toBe(dir);
    expect(exitListener).toBeDefined();
    exitListener?.();
    expect(existsSync(dir)).toBe(false);
    // A cleanup failure never breaks the exit path.
    let broken: (() => void) | undefined;
    ensureRunScopedMemoDir({
      env: {},
      mkdtemp: () => dir,
      onExit: (listener) => {
        broken = listener;
      },
      remove: () => {
        throw new Error('rm failed');
      },
    });
    expect(() => broken?.()).not.toThrow();
  });
});
