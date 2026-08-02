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

const blobOf = (payload: unknown): Uint8Array => {
  const json = Buffer.from(JSON.stringify(payload), 'utf8');
  const blob = new Uint8Array(json.length + 1);
  blob[0] = CHECKPOINT_FORMAT_V1;
  blob.set(json, 1);
  return blob;
};

describe('structural decode validation (RV804)', () => {
  it('a parseable blob with malformed nested messages decodes to undefined, never a raw TypeError', () => {
    // The twelfth experiment's reproduction: {v:1,messages:[{}]} passed
    // the top-level guard and the message map then died on
    // msg.parts.map, a raw TypeError out of a function whose contract
    // is "cannot parse means undefined and the dispatch reruns". Every
    // payload rides an otherwise-valid state so ONLY the structural
    // walk can be the refusal: since the counter validation shipped
    // (RV1409), a counterless minimal payload is refused before the
    // walk runs and no longer exercises it.
    expect(decodeCheckpoint(blobOf({ ...state(), messages: [{}] }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), messages: [null] }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), messages: ['garbage'] }))).toBeUndefined();
    expect(
      decodeCheckpoint(blobOf({ ...state(), messages: [{ role: 'user', parts: 'not-an-array' }] })),
    ).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), messages: [{ parts: [] }] }))).toBeUndefined();
    expect(
      decodeCheckpoint(blobOf({ ...state(), messages: [{ role: 'user', parts: [null] }] })),
    ).toBeUndefined();
    expect(
      decodeCheckpoint(blobOf({ ...state(), messages: [{ role: 'user', parts: [{}] }] })),
    ).toBeUndefined();
  });

  it('a well-formed checkpoint still round-trips unchanged', () => {
    expect(decodeCheckpoint(encodeCheckpoint(state()))).toEqual(state());
  });
});

describe('top-level decode guard (RV1008)', () => {
  it('a top-level null decodes to undefined, never a raw TypeError', () => {
    // JSON.parse('null') passes the try/catch, and parsed.v then threw
    // a raw TypeError out of a function whose contract is never-throws
    // (the nested RV804 walk never got the chance): the one top-level
    // shape the twelfth-experiment fix left open.
    expect(decodeCheckpoint(blobOf(null))).toBeUndefined();
  });

  it('top-level primitives and arrays decode to undefined without a throw', () => {
    for (const payload of [42, 'checkpoint', true, false, [], [1, 2], [{ v: 1 }]]) {
      expect(decodeCheckpoint(blobOf(payload))).toBeUndefined();
    }
  });

  it('the malformed corpus never throws: undefined is the whole answer', () => {
    const rawBlob = (text: string): Uint8Array => {
      const bytes = Buffer.from(text, 'utf8');
      const blob = new Uint8Array(bytes.length + 1);
      blob[0] = CHECKPOINT_FORMAT_V1;
      blob.set(bytes, 1);
      return blob;
    };
    const corpus = [
      'null',
      'nul',
      '42',
      '"checkpoint"',
      'true',
      'false',
      '[]',
      '[null]',
      '{',
      '{"v":1',
      '{"v":1}',
      '{"v":1,"messages":null}',
      '{"v":2,"messages":[]}',
      '\u0000\u0001\u0002',
    ];
    for (const text of corpus) {
      let decoded: unknown = 'sentinel';
      expect(
        () => {
          decoded = decodeCheckpoint(rawBlob(text));
        },
        `corpus entry ${JSON.stringify(text)} must not throw`,
      ).not.toThrow();
      expect(decoded, `corpus entry ${JSON.stringify(text)} must decode to undefined`).toBe(
        undefined,
      );
    }
  });

  it('a valid round-trip is unchanged by the guard', () => {
    expect(decodeCheckpoint(encodeCheckpoint(state()))).toEqual(state());
  });
});

describe('restored counter validation (RV1409)', () => {
  const rawBlob = (text: string): Uint8Array => {
    const bytes = Buffer.from(text, 'utf8');
    const blob = new Uint8Array(bytes.length + 1);
    blob[0] = CHECKPOINT_FORMAT_V1;
    blob.set(bytes, 1);
    return blob;
  };

  it('a poisoned turns counter refuses the whole checkpoint', () => {
    // A negative restored turns counter CREDITS the maxTurns ceiling
    // with turns nobody paid; a non-number poisons the comparison and
    // the increment. None of these was ever written by a legitimate
    // boundary write, so the blob is untrustworthy as a whole.
    expect(decodeCheckpoint(blobOf({ ...state(), turns: -3 }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), turns: '3' }))).toBeUndefined();
    // JSON.stringify(NaN) encodes to null: the NaN corruption arrives
    // at the decoder as a null counter.
    expect(decodeCheckpoint(blobOf({ ...state(), turns: null }))).toBeUndefined();
    // JSON has no Infinity literal, but 1e999 parses to it.
    expect(
      decodeCheckpoint(
        rawBlob(JSON.stringify({ ...state(), turns: 0 }).replace('"turns":0', '"turns":1e999')),
      ),
    ).toBeUndefined();
  });

  it('the sibling counters refuse alike: toolCallsUsed and schemaAttempts', () => {
    expect(decodeCheckpoint(blobOf({ ...state(), toolCallsUsed: -1 }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), toolCallsUsed: 'many' }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), schemaAttempts: null }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), schemaAttempts: -2 }))).toBeUndefined();
  });

  it('garbage usage fields refuse the whole checkpoint', () => {
    const usage = state().usage;
    expect(decodeCheckpoint(blobOf({ ...state(), usage: null }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), usage: 42 }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), usage: [usage] }))).toBeUndefined();
    expect(
      decodeCheckpoint(
        blobOf({
          v: 1,
          messages: [],
          turns: 0,
          toolCallsUsed: 0,
          schemaAttempts: 0,
          compaction: [],
        }),
      ),
    ).toBeUndefined();
    expect(
      decodeCheckpoint(blobOf({ ...state(), usage: { ...usage, inputTokens: -5 } })),
    ).toBeUndefined();
    expect(
      decodeCheckpoint(blobOf({ ...state(), usage: { ...usage, outputTokens: '1' } })),
    ).toBeUndefined();
    expect(
      decodeCheckpoint(blobOf({ ...state(), usage: { ...usage, cacheReadTokens: null } })),
    ).toBeUndefined();
    // A present optional field obeys the same rule; an absent one is legal.
    expect(
      decodeCheckpoint(blobOf({ ...state(), usage: { ...usage, reasoningTokens: -1 } })),
    ).toBeUndefined();
  });

  it('a non-array compaction, or garbage points inside it, refuse', () => {
    expect(decodeCheckpoint(blobOf({ ...state(), compaction: 5 }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), compaction: [null] }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), compaction: [-1] }))).toBeUndefined();
    expect(decodeCheckpoint(blobOf({ ...state(), compaction: [2] }))).toEqual(
      state({ compaction: [2] }),
    );
  });

  it('legacy non-normalized usage still decodes: repair is the loop, refusal is for garbage', () => {
    // The Usage invariant (cache subsets within inputTokens) and the
    // integer rules are sanitize-on-restore territory: checkpoints
    // written before those invariants shipped are trustworthy evidence
    // of paid work, just non-normalized. The decoder refuses only what
    // no legitimate writer ever produced.
    const invariantViolating = state({
      usage: { inputTokens: 5, outputTokens: 1, cacheReadTokens: 10, cacheWriteTokens: 0 },
    });
    expect(decodeCheckpoint(encodeCheckpoint(invariantViolating))).toEqual(invariantViolating);
    const fractional = state({
      usage: { inputTokens: 10.5, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
    });
    expect(decodeCheckpoint(encodeCheckpoint(fractional))).toEqual(fractional);
  });
});
