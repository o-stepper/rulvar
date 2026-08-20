/**
 * The production acceptance policy gate (RV4209, the sixth comparison
 * experiment). `--strict` keeps exit 0 on 'partial' and 'vacuous' by
 * documented design, and the experiment's run settled ok under a
 * standing waiver with three unsupported citations: a CI pipeline
 * reading that exit shipped the document. The matrix below pins the
 * production policy's whole vocabulary: clean passes, everything else
 * refuses with ONE stable JSON reason line, and `--strict` stays byte
 * identical because the new gate is a separate flag.
 */
import { describe, expect, it } from 'vitest';

import type { RunOutcome } from '@rulvar/core';
import { ConfigError } from '@rulvar/core';

import type { CliIo } from './io.js';
import { acceptancePolicyExitCode, strictExitCode } from './drive.js';

function capture(): CliIo & { errLines: string[]; outLines: string[] } {
  const errLines: string[] = [];
  const outLines: string[] = [];
  return {
    errLines,
    outLines,
    out: (line) => outLines.push(line),
    err: (line) => errLines.push(line),
    prompt: () => Promise.resolve(undefined),
    isTTY: false,
  };
}

const BASE: Omit<RunOutcome<unknown>, 'value'> = {
  status: 'ok',
  dropped: [],
  pending: [],
  usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  cost: {
    basis: 'locally-estimated',
    totalUsd: 0,
    grossUsd: 0,
    abandoned: { usd: 0, unpriced: [] },
    byModel: {},
    byPhase: {},
    byAgentType: {},
    byRole: {
      orchestrate: 0,
      plan: 0,
      loop: 0,
      finalize: 0,
      extract: 0,
      summarize: 0,
      synthesize: 0,
    },
    byScope: {},
    orchestrator: { spentUsd: 0, share: 0, wakes: 0, forcedFinish: false, reserveUsedUsd: 0 },
    unpriced: [],
  },
  envelope: {
    runId: 'r',
    workflow: 'w',
    status: 'ok',
    settled: true,
    totalUsd: 0,
    grossUsd: 0,
    costBasis: 'locally-estimated',
    costByModel: {},
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    usageApprox: false,
    agentsSpawned: 0,
  },
};

const outcomeWith = (
  verdict: Record<string, unknown> | undefined,
  overrides?: Partial<RunOutcome<unknown>>,
): RunOutcome<unknown> => ({
  ...BASE,
  value: {
    completion: 'complete',
    ...(verdict === undefined ? {} : { semanticTerminalVerdict: verdict }),
  },
  completion: 'complete',
  ...overrides,
});

const verdictOf = (word: string, extra?: Record<string, unknown>): Record<string, unknown> => ({
  verdict: word,
  contradictions: 0,
  unsupportedCitations: 0,
  partialCitations: 0,
  semanticRepairRounds: 0,
  judgeFailures: [],
  ...extra,
});

const reasonLineOf = (io: { errLines: string[] }): Record<string, unknown> => {
  const line = io.errLines.find((entry) => entry.startsWith('{"acceptancePolicy"'));
  expect(line).toBeDefined();
  return JSON.parse(line ?? '{}') as Record<string, unknown>;
};

describe('--acceptance-policy production (RV4209)', () => {
  it('refuses an unknown policy name typed', () => {
    const io = capture();
    expect(() =>
      acceptancePolicyExitCode('staging', outcomeWith(verdictOf('clean')), 0, io),
    ).toThrow(ConfigError);
  });

  it('clean exits 0 and says so', () => {
    const io = capture();
    expect(acceptancePolicyExitCode('production', outcomeWith(verdictOf('clean')), 0, io)).toBe(0);
    expect(io.errLines.join('\n')).toContain('acceptance policy production: clean');
  });

  it.each([
    ['partial', verdictOf('partial', { coverage: 'partial' })],
    ['vacuous', verdictOf('vacuous', { coverage: 'vacuous' })],
    [
      'waived',
      verdictOf('waived', {
        coverage: 'partial',
        waiver: { principal: 'owner', reason: 'gap', coverage: 'partial' },
      }),
    ],
    ['findings', verdictOf('findings', { contradictions: 1 })],
    ['not-judged', verdictOf('not-judged', { judgeFailures: ['claim-judge-failed'] })],
  ])('%s exits 1 with the stable JSON reason', (word, verdict) => {
    const io = capture();
    expect(acceptancePolicyExitCode('production', outcomeWith(verdict), 0, io)).toBe(1);
    const reason = reasonLineOf(io);
    expect(reason.acceptancePolicy).toBe('production');
    expect(reason.exit).toBe(1);
    expect(String(reason.reason)).toContain(word);
    expect((reason.verdict as Record<string, unknown>).verdict).toBe(word);
  });

  it('an ABSENT verdict refuses fail closed where strict would pass', () => {
    const io = capture();
    const outcome = outcomeWith(undefined);
    expect(strictExitCode(outcome, 0, capture())).toBe(0);
    expect(acceptancePolicyExitCode('production', outcome, 0, io)).toBe(1);
    expect(String(reasonLineOf(io).reason)).toContain('not-judged');
  });

  it('a suspended run refuses as unsettled where the base exit is 0', () => {
    const io = capture();
    const outcome = outcomeWith(verdictOf('clean'), {
      status: 'suspended',
    });
    expect(acceptancePolicyExitCode('production', outcome, 0, io)).toBe(1);
    expect(String(reasonLineOf(io).reason)).toContain('unsettled');
  });

  it("strict's mechanical refusals fire first under the same JSON envelope", () => {
    const io = capture();
    const outcome = {
      ...outcomeWith(verdictOf('clean')),
      deliverableAccepted: false,
    } as RunOutcome<unknown>;
    expect(acceptancePolicyExitCode('production', outcome, 0, io)).toBe(1);
    expect(String(reasonLineOf(io).reason)).toContain('strict');
  });

  it('a nonzero base exit passes through untouched', () => {
    const io = capture();
    expect(
      acceptancePolicyExitCode(
        'production',
        outcomeWith(verdictOf('clean'), { status: 'error' }),
        1,
        io,
      ),
    ).toBe(1);
    expect(io.errLines).toHaveLength(0);
  });

  it("partial keeps --strict's documented exit 0: the two gates stay distinct", () => {
    const strictIo = capture();
    const outcome = outcomeWith(verdictOf('partial', { coverage: 'partial' }));
    expect(strictExitCode(outcome, 0, strictIo)).toBe(0);
    expect(acceptancePolicyExitCode('production', outcome, 0, capture())).toBe(1);
  });
});
