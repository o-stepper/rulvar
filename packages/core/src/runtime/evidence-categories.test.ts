import { describe, expect, it } from 'vitest';

import { classifyEvidenceFile, EVIDENCE_CATEGORIES } from './evidence-categories.js';

describe('the evidence category classifier (RV4908)', () => {
  it('reads the path: tests, then examples, then docs, else implementation', () => {
    expect(
      [
        'packages/core/src/runtime/agent-loop.ts',
        'packages/core/src/runtime/agent-loop.test.ts',
        'packages/core/src/orchestrator/handles.spec.mjs',
        'packages/core/test/fixtures/run.json',
        'examples/src/verifier-lane.ts',
        'examples/src/index.test.ts',
        'docs/guide/agents.md',
        'README.md',
        'docs/examples/recipe.md',
        'scripts\\mutation-probe.mjs',
        '',
      ].map((file) => classifyEvidenceFile(file)),
    ).toEqual([
      'implementation',
      'tests',
      'tests',
      'tests',
      'examples',
      'tests',
      'docs',
      'docs',
      'examples',
      'implementation',
      'implementation',
    ]);
  });

  it('lists the four categories in the order every surface uses', () => {
    expect(EVIDENCE_CATEGORIES).toEqual(['implementation', 'tests', 'docs', 'examples']);
  });
});
