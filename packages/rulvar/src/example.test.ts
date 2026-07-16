import { describe, expect, it } from 'vitest';
import { createTestEngine, liveTestEnabled } from '@rulvar/testing';

import { anthropic, createEngine, openai } from './index.js';
import { basicReview } from './example/basic-review.js';

describe('M1 exit criteria: the example workflow (docs/10, section 3.2)', () => {
  it('runs ctx.agent/parallel/pipeline against FakeAdapter with zero network', async () => {
    const engine = createTestEngine({
      agents: {
        reviewer: (call) => ({
          file: /the file (\S+) /.exec(call.prompt)?.[1] ?? 'unknown',
          severity: 'medium',
          summary: 'looks fine',
        }),
        judge: () => ({ verdict: 'approve', reasons: ['clean diff'] }),
        '*': 'no concerns.',
      },
    });
    const run = engine.run(basicReview, { files: ['a.ts', 'b.ts', 'c.ts'] });
    const outcome = await run.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value?.findings).toHaveLength(3);
    expect(outcome.value?.findings.map((f) => f.file)).toEqual(['a.ts', 'b.ts', 'c.ts']);
    expect(outcome.value?.verdict).toBe('approve');
    expect(outcome.cost.totalUsd).toBe(0);
    // 3 pipeline reviewers + 2 parallel checks + 1 judge.
    expect(engine.fake.calls).toHaveLength(6);
  });

  // Gate only, no test-level retry wrapper: this is an engine E2E and
  // the core already owns retries and backoff for retryable provider
  // errors (RetryPolicy); wrapping the whole run would double the spend.
  it.skipIf(!liveTestEnabled('ANTHROPIC_API_KEY', 'OPENAI_API_KEY'))(
    'runs against both live adapters (opt-in via RULVAR_LIVE_TESTS=1, spends budget)',
    async () => {
      const engine = createEngine({
        adapters: [anthropic({}), openai({})],
        defaults: {
          routing: { loop: 'anthropic:claude-sonnet-5', extract: 'openai:gpt-5.4-mini' },
          profiles: { reviewer: {}, judge: {} },
        },
      });
      const outcome = await engine.run(basicReview, { files: ['README.md'] }, { budgetUsd: 1 })
        .result;
      expect(outcome.status).toBe('ok');
    },
    120_000,
  );
});
