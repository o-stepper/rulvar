import { describe, expect, it } from 'vitest';

import { SANDBOX_GLOBALS } from './compile.js';
import { apiCard } from './api-card.js';

describe('apiCard (M6-T04)', () => {
  it('is byte-stable across calls', () => {
    expect(apiCard()).toBe(apiCard());
    expect(apiCard()).toMatchSnapshot();
  });

  it('teaches exactly the curated global set', () => {
    const card = apiCard();
    for (const name of SANDBOX_GLOBALS) {
      // budget is an object facade; everything else is a function.
      expect(card).toContain(name === 'budget' ? 'budget.spent()' : `${name}(`);
    }
    // The complete-list claim guards against silent scope drift.
    expect(card).toContain('the COMPLETE list');
  });

  it('teaches the sanctioned dialect rules', () => {
    const card = apiCard();
    expect(card).toContain('JSON Schema LITERAL');
    expect(card).toContain('registered profile NAMES');
    expect(card).toContain("'throw' | 'null'");
    expect(card).toContain('await budget.spent()');
    expect(card).toContain('No import, require, or export');
    expect(card).toContain('Never put functions inside option objects');
    expect(card).toContain('{ key }');
  });

  it('never names concrete models', () => {
    expect(apiCard()).not.toMatch(/claude|gpt-\d|anthropic:|openai:/);
  });
});
