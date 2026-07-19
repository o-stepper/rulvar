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
    expect(card).toContain('registered TOOLSET names');
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

describe('tools and model semantics (v1.23.0 review P2-1 and P2-2)', () => {
  const profiles = { analyst: { description: 'analyzes things', tools: ['lookup'] } };
  const toolsets = { lookup: [] as never[] };

  it('tools strings are toolset names, never profile names', () => {
    const card = apiCard();
    // The runtime contract verbatim: strings resolve against
    // defaults.toolsets; a profile name there is a pre-call ConfigError.
    expect(card).toContain('registered TOOLSET names');
    expect(card).toContain('never agent profile names');
    expect(card).not.toMatch(/tools: an array of registered profile/u);
    // agentType keeps its own, separate teaching line.
    expect(card).toContain('agentType: a registered profile name from the profile card');
  });

  it('the composite prompt names the valid toolset strings and never offers a profile for tools', async () => {
    const { profileCard } = await import('@rulvar/core');
    const composite = `${apiCard()}\n${profileCard(profiles, toolsets)}`;
    // 'lookup' is named as a valid tools string by the profile card line.
    expect(composite).toContain(
      'Registered toolsets (valid string entries of a tools option): lookup.',
    );
    // 'analyst' appears ONLY as an agentType value, never beside tools.
    const analystLines = composite.split('\n').filter((line) => line.includes('analyst'));
    expect(analystLines.length).toBeGreaterThan(0);
    for (const line of analystLines) {
      expect(line).not.toContain('tools:');
    }
  });

  it('model and routing are host-owned: no promised ref source, omission is the norm', () => {
    const card = apiCard();
    expect(card).not.toContain('model ref from the profile card');
    expect(card).toContain('normally OMIT BOTH');
    expect(card).toContain('the profile card never names any');
    // The escape hatch is explicitly conditioned on the goal text.
    expect(card).toContain('goal text itself lists');
  });

  it('the standard profile card still never names concrete models', async () => {
    const { profileCard } = await import('@rulvar/core');
    const rendered = profileCard(profiles, toolsets);
    expect(rendered).not.toMatch(/claude|gpt-\d|anthropic:|openai:|fake:/u);
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
