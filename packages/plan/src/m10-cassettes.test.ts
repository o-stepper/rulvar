/**
 * M10 ModelKnowledge phase-1 cassettes (M10-T03; docs/09, section
 * 6.11): the committed fixture is the compatibility contract; a fresh
 * offline run of the same scenario reproduces it byte-for-byte after
 * the deterministic normalization. The knowledge store is a stub with
 * time-stable dates, so the pin bytes never age; replay-strict reads
 * the committed entries and never touches any live store.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { runKbPinReplay, runKbRepinExpiry } from './m10-cassettes.js';
import { type M7CassetteFixture } from './cassettes.js';

function cassette(id: string): M7CassetteFixture {
  const url = new URL(`../../../cassettes/${id}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as M7CassetteFixture;
}

const SCENARIOS: Array<[string, () => Promise<unknown>]> = [
  ['kb-pin-replay', runKbPinReplay],
  ['kb-repin-expiry', runKbRepinExpiry],
];

describe('M10 kb cassettes (M10-T03; docs/09 section 6.11)', () => {
  for (const [id, runner] of SCENARIOS) {
    it(`${id}: a fresh offline run reproduces the committed cassette`, async () => {
      const committed = cassette(id);
      const fresh = await runner();
      expect(fresh).toEqual(committed.entries);
    }, 20_000);
  }
});
