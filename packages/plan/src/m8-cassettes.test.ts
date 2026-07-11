import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SqliteStore } from '@rulvar/store-sqlite';

import { runQueueFailoverDuringForcedFinish, type M7CassetteFixture } from './cassettes.js';

function cassette(id: string): M7CassetteFixture {
  const url = new URL(`../../../cassettes/${id}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as M7CassetteFixture;
}

/**
 * The M8 gating cassette (docs/09 section 6.9; docs/10 section 3.9):
 * the committed fixture is the compatibility contract; a fresh offline
 * run of the same scenario over the REFERENCE LeasableStore must
 * reproduce it byte-for-byte after normalization. The runner itself
 * asserts the DEF-7 queue invariants (exactly one cap decision, one
 * finalize pair after it, stale appends rejected and invisible).
 */
describe('M8 gating cassette (M8-T03; docs/09 section 6)', () => {
  it('queue-failover-during-forced-finish: a fresh offline run reproduces the committed cassette', async () => {
    const committed = cassette('queue-failover-during-forced-finish');
    const fresh = await runQueueFailoverDuringForcedFinish({
      makeStore: (now) => new SqliteStore({ path: ':memory:', ttlMs: 60_000, now }),
    });
    expect(fresh).toEqual(committed.entries);
  });
});
