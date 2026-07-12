/**
 * HistoryProjector unit tests (M4-T02): the provider-raw projection rule,
 * the retention lift, and the provider-family helper.
 */
import { describe, expect, it } from 'vitest';

import type { Msg } from '../l0/messages.js';
import { liftRetainedParts, projectHistory, providerOf } from './projector.js';

const thinking = { type: 'thinking', thinking: 'hmm', signature: 'sig-1' };
const reasoning = { type: 'reasoning', id: 'rs_1', encrypted_content: 'blob' };

const mixed: Msg[] = [
  { role: 'user', parts: [{ type: 'text', text: 'question' }] },
  {
    role: 'assistant',
    parts: [
      { type: 'provider-raw', provider: 'anthropic', block: thinking },
      { type: 'text', text: 'calling a tool' },
      { type: 'tool-call', id: 'c1', name: 'clock', args: {} },
    ],
  },
  { role: 'tool', parts: [{ type: 'tool-result', id: 'c1', name: 'clock', result: '12:00' }] },
  {
    role: 'assistant',
    parts: [
      { type: 'provider-raw', provider: 'openai', block: reasoning },
      { type: 'text', text: 'done' },
    ],
  },
];

describe('projectHistory', () => {
  it('keeps provider-raw parts only for the matching provider', () => {
    const anthropicView = projectHistory(mixed, 'anthropic');
    const rawOf = (msgs: Msg[]): string[] =>
      msgs.flatMap((m) => m.parts.filter((p) => p.type === 'provider-raw').map((p) => p.provider));
    expect(rawOf(anthropicView)).toEqual(['anthropic']);
    const openaiView = projectHistory(mixed, 'openai');
    expect(rawOf(openaiView)).toEqual(['openai']);
  });

  it('never touches non-raw parts, ids, or ordering', () => {
    const view = projectHistory(mixed, 'openai');
    expect(view).toHaveLength(4);
    // The anthropic assistant message lost only its raw head.
    expect(view[1]?.parts.map((p) => p.type)).toEqual(['text', 'tool-call']);
    expect(view[1]?.parts[1]).toMatchObject({ id: 'c1', name: 'clock' });
    // Untouched messages ride as the same reference.
    expect(view[0]).toBe(mixed[0]);
    expect(view[2]).toBe(mixed[2]);
  });

  it('drops a message entirely when every part belongs to another provider', () => {
    const rawOnly: Msg[] = [
      { role: 'assistant', parts: [{ type: 'provider-raw', provider: 'anthropic', block: {} }] },
    ];
    expect(projectHistory(rawOnly, 'openai')).toHaveLength(0);
    expect(projectHistory(rawOnly, 'anthropic')).toHaveLength(1);
  });
});

describe('liftRetainedParts', () => {
  it('lifts the adapter-id namespace and tags the provider family', () => {
    const parts = liftRetainedParts(
      { groq: { retainedParts: [reasoning, { extra: true }] } },
      { id: 'groq', provider: 'openai' },
    );
    expect(parts).toEqual([
      { type: 'provider-raw', provider: 'openai', block: reasoning },
      { type: 'provider-raw', provider: 'openai', block: { extra: true } },
    ]);
  });

  it('returns [] for absent metadata, foreign namespaces, or malformed payloads', () => {
    expect(liftRetainedParts(undefined, { id: 'anthropic' })).toEqual([]);
    expect(liftRetainedParts({ openai: { retainedParts: [{}] } }, { id: 'anthropic' })).toEqual([]);
    expect(liftRetainedParts({ anthropic: {} }, { id: 'anthropic' })).toEqual([]);
    expect(
      liftRetainedParts({ anthropic: { retainedParts: 'not-an-array' } }, { id: 'anthropic' }),
    ).toEqual([]);
  });
});

describe('providerOf', () => {
  it('prefers the provider family over the adapter id', () => {
    expect(providerOf({ id: 'groq', provider: 'openai' })).toBe('openai');
    expect(providerOf({ id: 'anthropic' })).toBe('anthropic');
  });
});
