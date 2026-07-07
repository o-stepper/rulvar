/**
 * Frozen-fixture drift guard (M2-T12 acceptance; docs/11, section
 * "Frozen journal fixtures"). The committed files are the DEF-6
 * compatibility contract; the builders re-derive them through the live
 * KeyDeriver profiles. Any divergence means the identity pipeline moved:
 * that is a hashVersion bump, never a fixture regeneration. The
 * byte-level lock (fixtures.sha256, scripts/check-frozen-fixtures.mjs)
 * guards the committed files themselves in CI.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildFrozenV1JournalRaw,
  buildM2CassetteFixtures,
  buildV2GoldenIdentity,
} from './build-fixtures.js';

function readRepo(path: string): string {
  return readFileSync(new URL(`../../../../${path}`, import.meta.url), 'utf8');
}

describe('frozen fixtures match their builders exactly', () => {
  it('every committed cassette equals its builder output', () => {
    const fixtures = buildM2CassetteFixtures();
    expect(fixtures.map((fixture) => fixture.id)).toEqual([
      'abandon-subtree',
      'memoize-classifier',
      'v1-journal-on-v2',
      'timeout-vs-live-race',
      'class-decision-fanout',
      'abandon-then-crash-then-resume',
      'abandon-vs-resolution-race',
      'offline-invalid-then-valid',
      'double-abandon-idempotent',
      'reject-version-too-old',
      'reject-version-from-future',
    ]);
    for (const fixture of fixtures) {
      const committed: unknown = JSON.parse(readRepo(`cassettes/${fixture.id}.json`));
      expect(committed, fixture.id).toEqual(fixture);
    }
  });

  it('the frozen v1 JSONL journal equals its builder output line by line', () => {
    const committed = readRepo('packages/testing/fixtures/frozen/v1-journal.jsonl')
      .trim()
      .split('\n');
    const built = buildFrozenV1JournalRaw().map((entry) => JSON.stringify(entry));
    expect(committed).toEqual(built);
    // Round-1 wire shape: the legacy `v` field, never hashVersion.
    for (const line of committed) {
      const raw = JSON.parse(line) as Record<string, unknown>;
      expect(raw.v).toBe(1);
      expect(raw.hashVersion).toBeUndefined();
    }
  });

  it('the v2 golden identity fixture equals its builder output', () => {
    const committed: unknown = JSON.parse(
      readRepo('packages/testing/fixtures/frozen/v2-golden-identity.json'),
    );
    expect(committed).toEqual(buildV2GoldenIdentity());
  });
});
