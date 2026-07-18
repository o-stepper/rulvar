import { describe, expect, it } from 'vitest';

import { tool } from '../tools/tool.js';
import type { AgentProfile } from '../engine/ctx.js';
import { profileCard } from './profile-card.js';

const grep = tool({
  name: 'grep',
  description: 'search files',
  parameters: { type: 'object', properties: {}, additionalProperties: false },
  execute: () => Promise.resolve('ok'),
});

const PROFILES: Record<string, AgentProfile> = {
  reviewer: {
    description: 'reviews code diffs for defects',
    tools: [grep, 'scout'],
    taskClass: 'code-review',
    estCost: 0.4,
    escalation: { flavor: 'A' },
    // Model-adjacent fields MUST NOT leak onto the card.
    model: 'anthropic:claude-fable-5',
    routing: { extract: 'openai:gpt-5' },
  },
  scout: {},
};

describe('profileCard (M6-T04)', () => {
  it('renders the registry sorted, with model-agnostic fields only', () => {
    const card = profileCard(PROFILES);
    expect(card).toBe(
      [
        'Agent profiles (agentType values):',
        '- reviewer: reviews code diffs for defects',
        '  tools: grep, scout (registered toolset)',
        '  taskClass: code-review',
        '  estCost: 0.40 USD',
        '  escalation: flavor A (opt-in)',
        '- scout: no description',
      ].join('\n'),
    );
    // The one-vocabulary rule: no model names anywhere on the card.
    expect(card).not.toMatch(/claude|gpt|anthropic:|openai:/);
  });

  it('is a pure function of the registry: byte-stable and order-insensitive', () => {
    const again = profileCard(PROFILES);
    const reordered = profileCard({ scout: {}, reviewer: PROFILES.reviewer });
    expect(again).toBe(profileCard(PROFILES));
    expect(reordered).toBe(profileCard(PROFILES));
  });

  it('renders an empty registry explicitly', () => {
    expect(profileCard(undefined)).toBe(
      'Agent profiles: none registered. Calls take no agentType.',
    );
    expect(profileCard({})).toBe('Agent profiles: none registered. Calls take no agentType.');
  });

  it('lists registered toolset names only when the registry is non-empty', () => {
    // v1.17.0 review P1-3: the card names the ONLY valid string entries
    // of a tools option, so the planner never invents a registry name.
    // An empty or absent registry renders nothing (cassette-pinned).
    expect(profileCard({}, {})).toBe('Agent profiles: none registered. Calls take no agentType.');
    expect(profileCard({}, { 'lookup-set': [], 'audit-set': [] })).toBe(
      'Agent profiles: none registered. Calls take no agentType.\n' +
        'Registered toolsets (valid string entries of a tools option): audit-set, lookup-set.',
    );
    const withProfiles = profileCard(PROFILES, { 'lookup-set': [] });
    expect(withProfiles.endsWith('Registered toolsets (valid string entries of a tools option): lookup-set.')).toBe(
      true,
    );
  });
});
