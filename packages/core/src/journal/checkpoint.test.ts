import { describe, expect, it } from 'vitest';

import type { Msg } from '../l0/messages.js';
import {
  CHECKPOINT_FORMAT_V1,
  checkpointRefFor,
  decodeCheckpoint,
  encodeCheckpoint,
  type CheckpointState,
} from './checkpoint.js';

const HISTORY: Msg[] = [
  { role: 'user', parts: [{ type: 'text', text: 'check the weather' }] },
  {
    role: 'assistant',
    parts: [{ type: 'tool-call', id: 'id-0-0', name: 'lookup', args: { topic: 'weather' } }],
  },
  {
    role: 'tool',
    parts: [{ type: 'tool-result', id: 'id-0-0', name: 'lookup', result: { fact: 'sunny' } }],
  },
];

function state(overrides?: Partial<CheckpointState>): CheckpointState {
  return {
    v: 1,
    messages: HISTORY,
    turns: 1,
    usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
    toolCallsUsed: 1,
    schemaAttempts: 0,
    compaction: [],
    ...overrides,
  };
}

describe('turn-boundary checkpoint blob (M3-T02)', () => {
  it('round-trips the canonical history with the leading format byte', () => {
    const blob = encodeCheckpoint(state());
    expect(blob[0]).toBe(CHECKPOINT_FORMAT_V1);
    const decoded = decodeCheckpoint(blob);
    expect(decoded).toEqual(state());
  });

  it('round-trips image parts carrying raw bytes', () => {
    const withImage = state({
      messages: [
        ...HISTORY,
        {
          role: 'user',
          parts: [{ type: 'image', mediaType: 'image/png', data: new Uint8Array([1, 2, 255]) }],
        },
      ],
    });
    const decoded = decodeCheckpoint(encodeCheckpoint(withImage));
    const part = decoded?.messages.at(-1)?.parts[0];
    expect(part?.type).toBe('image');
    expect((part as { data: Uint8Array }).data).toEqual(new Uint8Array([1, 2, 255]));
  });

  it('round-trips the pending mid-turn suspension state', () => {
    const suspended = state({
      pending: {
        executed: [{ id: 'id-1-0', name: 'read', result: 'ok' }],
        awaiting: { id: 'id-1-1', name: 'write', args: { path: 'x' } },
        remaining: [{ id: 'id-1-2', name: 'read', args: {} }],
      },
    });
    expect(decodeCheckpoint(encodeCheckpoint(suspended))).toEqual(suspended);
  });

  it('refuses an unknown format byte instead of guessing', () => {
    const blob = encodeCheckpoint(state());
    const foreign = new Uint8Array(blob);
    foreign[0] = 0x7f;
    expect(decodeCheckpoint(foreign)).toBeUndefined();
  });

  it('refuses truncated or garbage blobs', () => {
    expect(decodeCheckpoint(new Uint8Array([]))).toBeUndefined();
    expect(decodeCheckpoint(new Uint8Array([CHECKPOINT_FORMAT_V1]))).toBeUndefined();
    expect(decodeCheckpoint(new Uint8Array([CHECKPOINT_FORMAT_V1, 0x7b, 0x22]))).toBeUndefined();
  });

  it('derives a deterministic per-dispatch ref', () => {
    expect(checkpointRefFor('run-9', 4)).toBe('run-9/ckpt/4');
    expect(checkpointRefFor('run-9', 4)).toBe(checkpointRefFor('run-9', 4));
  });
});

describe('structural decode validation (RV804)', () => {
  const blobOf = (payload: unknown): Uint8Array => {
    const json = Buffer.from(JSON.stringify(payload), 'utf8');
    const blob = new Uint8Array(json.length + 1);
    blob[0] = CHECKPOINT_FORMAT_V1;
    blob.set(json, 1);
    return blob;
  };

  it('a parseable blob with malformed nested messages decodes to undefined, never a raw TypeError', () => {
    // The twelfth experiment's reproduction: {v:1,messages:[{}]} passed
    // the top-level guard and the message map then died on
    // msg.parts.map, a raw TypeError out of a function whose contract
    // is "cannot parse means undefined and the dispatch reruns".
    expect(decodeCheckpoint(blobOf({ v: 1, messages: [{}], turns: 0 }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ v: 1, messages: [null] }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ v: 1, messages: ['garbage'] }))).toBeUndefined();
    expect(
      decodeCheckpoint(blobOf({ v: 1, messages: [{ role: 'user', parts: 'not-an-array' }] })),
    ).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ v: 1, messages: [{ parts: [] }] }))).toBeUndefined();
    expect(
      decodeCheckpoint(blobOf({ v: 1, messages: [{ role: 'user', parts: [null] }] })),
    ).toBeUndefined();
    expect(
      decodeCheckpoint(blobOf({ v: 1, messages: [{ role: 'user', parts: [{}] }] })),
    ).toBeUndefined();
  });

  it('a well-formed checkpoint still round-trips unchanged', () => {
    expect(decodeCheckpoint(encodeCheckpoint(state()))).toEqual(state());
  });
});
