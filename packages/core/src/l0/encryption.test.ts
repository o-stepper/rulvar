/**
 * Envelope encryption over the serialization hook (RV-217): symmetric
 * round trips, identity-bound authentication, key-ring routing with
 * historical keys, tenant-partitioned providers, and fail-closed
 * plaintext reads.
 */
import { createCipheriv, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { ConfigError } from './errors.js';
import type { JournalEntry } from './entries.js';
import {
  JOURNAL_ENVELOPE_MARKER,
  constantTimeEqual,
  createEnvelopeEncryption,
  localKeyProvider,
} from './encryption.js';

const SECRET = 'a-very-long-deployment-master-secret';
const PII = 'ivan.petrov+medical@example.com';

function entry(seq: number, over: Partial<JournalEntry> = {}): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: 'agent:1',
    key: `k-${String(seq)}`,
    ordinal: 0,
    kind: 'step',
    status: 'ok',
    value: { patient: PII, note: 'confidential' },
    usage: { inputTokens: 3, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 },
    spanId: 'span-1',
    startedAt: '2026-07-24T00:00:00.000Z',
    endedAt: '2026-07-24T00:00:01.000Z',
    ...over,
  };
}

describe('createEnvelopeEncryption', () => {
  it('round-trips a journal entry with the payload unreadable at rest', async () => {
    const enc = await createEnvelopeEncryption({ provider: localKeyProvider({ secret: SECRET }) });
    const original = entry(7);
    const stored = enc.hook.journal!.toStored(original);
    // Pinned identity plus operational metadata stay plaintext...
    expect(stored.seq).toBe(7);
    expect(stored.key).toBe('k-7');
    expect(stored.spanId).toBe('span-1');
    expect(stored.startedAt).toBe('2026-07-24T00:00:00.000Z');
    // ...and NOTHING else does: the stored bytes never contain the PII.
    expect(JSON.stringify(stored)).not.toContain(PII);
    expect(stored.usage).toBeUndefined();
    expect((stored.value as Record<string, unknown>)[JOURNAL_ENVELOPE_MARKER]).toBeDefined();
    expect(enc.hook.journal!.fromStored(stored)).toEqual(original);
  });

  it('round-trips a transcript blob and binds it to its ref', async () => {
    const enc = await createEnvelopeEncryption({ provider: localKeyProvider({ secret: SECRET }) });
    const blob = new TextEncoder().encode(`transcript for ${PII}`);
    const stored = enc.hook.transcripts!.toStored('RUN1/ckpt/1', blob);
    expect(Buffer.from(stored).includes(Buffer.from(PII, 'utf8'))).toBe(false);
    expect(enc.hook.transcripts!.fromStored('RUN1/ckpt/1', stored)).toEqual(blob);
    // The ref is associated data: the same bytes under another ref fail.
    expect(() => enc.hook.transcripts!.fromStored('RUN1/ckpt/2', stored)).toThrow(
      /authentication failed/,
    );
  });

  it('authenticates entry identity: a ciphertext moved between entries fails typed', async () => {
    const enc = await createEnvelopeEncryption({ provider: localKeyProvider({ secret: SECRET }) });
    const storedA = enc.hook.journal!.toStored(entry(1));
    const storedB = enc.hook.journal!.toStored(entry(2));
    const swapped: JournalEntry = { ...storedB, value: storedA.value };
    expect(() => enc.hook.journal!.fromStored(swapped)).toThrow(/associated data/);
    // A flipped ciphertext byte fails too.
    const env = (storedA.value as Record<string, { data: string }>)[JOURNAL_ENVELOPE_MARKER];
    const bytes = Buffer.from(env.data, 'base64');
    bytes[0] = bytes[0] ^ 0xff;
    const tampered: JournalEntry = {
      ...storedA,
      value: { [JOURNAL_ENVELOPE_MARKER]: { ...env, data: bytes.toString('base64') } },
    };
    expect(() => enc.hook.journal!.fromStored(tampered)).toThrow(/authentication failed/);
  });

  it('writes the v2 identity-binding envelope schema', async () => {
    const enc = await createEnvelopeEncryption({ provider: localKeyProvider({ secret: SECRET }) });
    const stored = enc.hook.journal!.toStored(entry(5), { runId: 'RUN-A' });
    const env = (stored.value as Record<string, { v: number }>)[JOURNAL_ENVELOPE_MARKER];
    expect(env.v).toBe(2);
  });

  it('binds the ciphertext to its runId: a transplant into another run fails typed', async () => {
    const enc = await createEnvelopeEncryption({ provider: localKeyProvider({ secret: SECRET }) });
    const original = entry(4);
    const stored = enc.hook.journal!.toStored(original, { runId: 'RUN-A' });
    // The same wrapped key, the same entry identity, a DIFFERENT run:
    // the runId is associated data, so authentication fails.
    expect(() => enc.hook.journal!.fromStored(stored, { runId: 'RUN-B' })).toThrow(
      /associated data/,
    );
    // The writing run reads it back cleanly.
    expect(enc.hook.journal!.fromStored(stored, { runId: 'RUN-A' })).toEqual(original);
  });

  it('binds every clear identity field: a flipped status/scope/ordinal/kind fails typed', async () => {
    const enc = await createEnvelopeEncryption({ provider: localKeyProvider({ secret: SECRET }) });
    const stored = enc.hook.journal!.toStored(entry(6), { runId: 'RUN-A' });
    const ctx = { runId: 'RUN-A' };
    // Each clear field is part of the AAD: rewriting it on disk and
    // reading back fails, so a stored entry cannot be silently retyped.
    for (const over of [
      { status: 'error' as const },
      { scope: 'agent:evil' },
      { ordinal: 9 },
      { kind: 'decision' as const },
      { hashVersion: 1 as const },
    ]) {
      const forged: JournalEntry = { ...stored, ...over };
      expect(() => enc.hook.journal!.fromStored(forged, ctx)).toThrow(/associated data/);
    }
  });

  it('reads a legacy v1 envelope (migration): the seq:key schema still decrypts', async () => {
    const provider = localKeyProvider({ secret: SECRET });
    // Hand-build a v1 envelope exactly as pre-upgrade writes did: the
    // OLD `journal:seq:key` AAD, the provider's own data key.
    const { plaintext, wrapped } = await provider.generateDataKey();
    const original = entry(11);
    const { value: _dropped, ...clear } = original;
    const rest = { value: original.value, usage: original.usage };
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(plaintext), iv);
    cipher.setAAD(Buffer.from(`journal:${String(original.seq)}:${original.key}`, 'utf8'));
    const ct = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(rest))), cipher.final()]);
    const v1Envelope = {
      v: 1 as const,
      keyId: provider.keyId,
      wrapped: Buffer.from(wrapped).toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: ct.toString('base64'),
    };
    const storedV1: JournalEntry = {
      ...(clear as JournalEntry),
      value: { [JOURNAL_ENVELOPE_MARKER]: v1Envelope },
    };

    // A fresh session that registers the wrapped key reads the v1
    // envelope back, under any runId (v1 never bound the run).
    const enc = await createEnvelopeEncryption({
      provider,
      historicalWrappedKeys: [wrapped],
    });
    expect(enc.hook.journal!.fromStored(storedV1, { runId: 'whatever' })).toEqual(original);
  });

  it('routes decryption through the key ring: historical wrapped keys read, unknown ones fail typed', async () => {
    const provider = localKeyProvider({ secret: SECRET });
    const older = await createEnvelopeEncryption({ provider });
    const stored = older.hook.journal!.toStored(entry(3));

    // A fresh session WITHOUT the historical key cannot read...
    const fresh = await createEnvelopeEncryption({ provider });
    expect(() => fresh.hook.journal!.fromStored(stored)).toThrow(/historicalWrappedKeys/);

    // ...and WITH it, reads fine.
    const rotated = await createEnvelopeEncryption({
      provider,
      historicalWrappedKeys: [older.wrappedDataKey],
    });
    expect(rotated.hook.journal!.fromStored(stored)).toEqual(entry(3));
  });

  it('tenant-partitioned providers cannot unwrap each other', async () => {
    const acme = localKeyProvider({ secret: SECRET, info: 'tenant:acme', keyId: 'local:acme' });
    const globex = localKeyProvider({
      secret: SECRET,
      info: 'tenant:globex',
      keyId: 'local:globex',
    });
    const acmeEnc = await createEnvelopeEncryption({ provider: acme });
    await expect(
      createEnvelopeEncryption({
        provider: globex,
        historicalWrappedKeys: [acmeEnc.wrappedDataKey],
      }),
    ).rejects.toThrow(/cannot unwrap the data key/);
  });

  it("fails closed on plaintext stored data by default; 'passthrough' is the migration mode", async () => {
    const reject = await createEnvelopeEncryption({
      provider: localKeyProvider({ secret: SECRET }),
    });
    const plain = entry(9);
    expect(() => reject.hook.journal!.fromStored(plain)).toThrow(/plaintextReads/);
    expect(() => reject.hook.transcripts!.fromStored('r/1', new Uint8Array([1, 2, 3]))).toThrow(
      /plaintextReads/,
    );
    const migrate = await createEnvelopeEncryption({
      provider: localKeyProvider({ secret: SECRET }),
      plaintextReads: 'passthrough',
    });
    expect(migrate.hook.journal!.fromStored(plain)).toEqual(plain);
    expect(migrate.hook.transcripts!.fromStored('r/1', new Uint8Array([1, 2, 3]))).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it('validates its inputs typed', async () => {
    await expect(createEnvelopeEncryption({ provider: 42 as never })).rejects.toThrow(ConfigError);
    await expect(
      createEnvelopeEncryption({
        provider: localKeyProvider({ secret: SECRET }),
        plaintextReads: 'sometimes' as never,
      }),
    ).rejects.toThrow(ConfigError);
    expect(() => localKeyProvider({ secret: '' })).toThrow(ConfigError);
    expect(() => localKeyProvider({ secret: new Uint8Array(4) })).toThrow(/at least 16 bytes/);
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(false);
  });
});
