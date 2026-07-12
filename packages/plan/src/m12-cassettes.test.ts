/**
 * M12 ModelKnowledge phase-3 cassette (M12-T02): the committed fixture
 * is the compatibility contract; a fresh offline run of the same
 * scenario reproduces it byte-for-byte after the deterministic
 * normalization. The quarantine assertions run inside the runner.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { runKbProposeQuarantine } from './m12-cassettes.js';
import { type M7CassetteFixture } from './cassettes.js';

function cassette(id: string): M7CassetteFixture {
  const url = new URL(`../../../cassettes/${id}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as M7CassetteFixture;
}

describe('M12 kb_propose cassette (M12-T02)', () => {
  it('kb-propose-quarantine: a fresh offline run reproduces the committed cassette', async () => {
    const committed = cassette('kb-propose-quarantine');
    const fresh = await runKbProposeQuarantine();
    expect(fresh).toEqual(committed.entries);
  }, 20_000);
});
