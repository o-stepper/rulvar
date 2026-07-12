/**
 * M8-T04 unit tests: the default key-masking policy and the
 * serialization-hook wrappers: symmetric round-trip through
 * the wrapped stores, kernel-field drift rejection, lease passthrough.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from './errors.js';
import type { JournalEntry } from './entries.js';
import type { Bytes } from './json.js';
import {
  MASKED_SECRET,
  maskSecrets,
  maskSecretsDeep,
  wrapJournalStore,
  wrapTranscriptStore,
  type JournalSerializationHook,
} from './serialization.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';

function entry(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    hashVersion: 2,
    seq: 0,
    scope: 'run',
    key: 'k',
    ordinal: 0,
    kind: 'rand',
    status: 'ok',
    spanId: 's0',
    startedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('maskSecrets (M8-T04 default policy)', () => {
  it('masks credential-shaped strings of every committed pattern', () => {
    const samples = [
      'sk-abc123def456ghi789jkl012',
      'sk-ant-api03-abcdefghijklmnop',
      'AKIAIOSFODNN7EXAMPLE',
      'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef1234',
      'github_pat_11ABCDEFG0123456789_abcdefghij',
      'xoxb-123456789012-abcdefghijklmnop',
      'AIzaSyA1234567890abcdefghijklmnopqrstuv',
      'Bearer abcdefghijklmnopqrstuvwxyz0123456789',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N65OQag',
    ];
    for (const sample of samples) {
      const masked = maskSecrets(`prefix ${sample} suffix`);
      expect(masked, sample).toContain(MASKED_SECRET);
      expect(masked, sample).not.toContain(sample);
    }
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----';
    expect(maskSecrets(pem)).toBe(MASKED_SECRET);
  });

  it('leaves ordinary text, ids, and short tokens alone', () => {
    for (const clean of [
      'analyze the pull request #42',
      'run 01JX47WWGTJMRYTNXNRF2EM4E8 settled ok',
      'skeleton and skill are words, sk-shorty stays',
      'the model claude-fable-5 costs $0.01',
    ]) {
      expect(maskSecrets(clean)).toBe(clean);
    }
  });

  it('deep-masks nested values and keeps identity for clean trees', () => {
    const dirty = {
      msg: 'token sk-abc123def456ghi789jkl012 leaked',
      nested: [{ auth: 'Bearer abcdefghijklmnopqrstuvwxyz0123456789' }],
      count: 3,
    };
    const masked = maskSecretsDeep(dirty);
    expect(masked.msg).toContain(MASKED_SECRET);
    expect(masked.nested[0]?.auth).toBe(MASKED_SECRET);
    expect(masked.count).toBe(3);

    const clean = { msg: 'nothing secret', n: [1, 2, { deep: true }] };
    expect(maskSecretsDeep(clean)).toBe(clean);
  });
});

describe('serialization hook wrappers (M8-T04; docs/03 12.8)', () => {
  const b64: JournalSerializationHook = {
    toStored: (e) =>
      e.value === undefined
        ? e
        : { ...e, value: Buffer.from(JSON.stringify(e.value), 'utf8').toString('base64') },
    fromStored: (e) =>
      typeof e.value === 'string'
        ? { ...e, value: JSON.parse(Buffer.from(e.value, 'base64').toString('utf8')) as never }
        : e,
  };

  it('round-trips symmetrically: stored bytes differ, loaded entries match', async () => {
    const inner = new InMemoryStore();
    const wrapped = wrapJournalStore(inner, b64);
    const original = entry({ value: { secret: 'payload', n: 1 } });
    await wrapped.append('r1', original);

    const stored = await inner.load('r1');
    expect(stored[0]?.value).toBeTypeOf('string');
    expect(JSON.stringify(stored[0]?.value)).not.toContain('payload');

    const loaded = await wrapped.load('r1');
    expect(loaded[0]).toEqual(original);
  });

  it('rejects kernel-field drift loudly', async () => {
    const inner = new InMemoryStore();
    const drifting = wrapJournalStore(inner, {
      toStored: (e) => ({ ...e, seq: e.seq + 1 }),
      fromStored: (e) => e,
    });
    await expect(drifting.append('r1', entry({}))).rejects.toThrowError(ConfigError);
  });

  it('preserves lease capability only when the inner store has it', () => {
    const plain = wrapJournalStore(new InMemoryStore(), b64);
    expect((plain as { acquire?: unknown }).acquire).toBeUndefined();
  });

  it('wraps transcript blobs symmetrically', async () => {
    const inner = new InMemoryTranscriptStore();
    const wrapped = wrapTranscriptStore(inner, {
      toStored: (_ref, blob) => blob.map((byte) => byte ^ 0x5a),
      fromStored: (_ref, blob) => blob.map((byte) => byte ^ 0x5a),
    });
    const blob = new TextEncoder().encode('checkpoint contents');
    await wrapped.put('r1/t0', blob);

    const raw = await inner.get('r1/t0');
    expect(new TextDecoder().decode(raw as Bytes)).not.toContain('checkpoint');

    const roundTripped = await wrapped.get('r1/t0');
    expect(new TextDecoder().decode(roundTripped as Bytes)).toBe('checkpoint contents');

    await wrapped.delete('r1/t0');
    expect(await inner.get('r1/t0')).toBeNull();
    expect(await wrapped.get('r1/t0')).toBeNull();
  });
});
