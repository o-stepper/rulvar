import { describe, expect, it } from 'vitest';

import { SANDBOX_AGENT_OPT_KEYS } from '@rulvar/core';

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

describe('card and runtime allowlist parity (v1.22.0 review P2-4)', () => {
  it('the opts line is generated from SANDBOX_AGENT_OPT_KEYS, so every runtime key appears', () => {
    const card = apiCard();
    const optsLine = card.split('\n').find((line) => line.includes('opts (JSON only)'));
    expect(optsLine).toBeDefined();
    for (const key of SANDBOX_AGENT_OPT_KEYS) {
      expect(optsLine).toContain(`${key}?`);
    }
    // No key is claimed that the runtime would reject.
    const claimed = (optsLine ?? '')
      .slice((optsLine ?? '').indexOf('{') + 1, (optsLine ?? '').lastIndexOf('}'))
      .split(',')
      .map((part) => part.trim().replace(/\?$/, ''))
      .filter((part) => part.length > 0);
    expect(new Set(claimed)).toEqual(new Set(SANDBOX_AGENT_OPT_KEYS));
  });

  it('states the true ordinal semantics of identical calls', () => {
    const card = apiCard();
    expect(card).toContain('journals as its OWN operation');
    expect(card).toContain('sequential ordinals');
    expect(card).not.toContain('journal as ONE result');
    expect(card).toContain('routing:');
    expect(card).toContain('memoizeOutcome:');
    expect(card).toContain("replay: 'cache' | 'never'");
  });
});
