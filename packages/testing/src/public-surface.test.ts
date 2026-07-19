/**
 * The published surface contract (v1.23.0 review): the root barrel
 * carries ONLY the supported tiers (FakeAdapter/createTestEngine, VCR,
 * replay-strict, live smoke); the repository-only cassette recording
 * plumbing lives on an internal dist entry that the exports map never
 * exposes, so no consumer specifier reaches it and it is not semver
 * surface.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPOSITORY_ONLY = [
  'buildFrozenV1JournalRaw',
  'buildM2CassetteFixtures',
  'buildV2GoldenIdentity',
  'recordLiveCassettes',
  'recordOrchestratorCrash',
  'normalizeM6Entries',
  'handlesInRequest',
  'M6_ORCH_GOAL',
  'M6_ORCH_PROFILES',
  'M6_ORCH_RUN_ID',
];

describe('the published root surface (v1.23.0 review)', () => {
  it('the built root barrel ships none of the repository-only recorder symbols', () => {
    for (const artifact of ['index.js', 'index.d.ts']) {
      const built = readFileSync(resolve(import.meta.dirname, '../dist', artifact), 'utf8');
      for (const symbol of REPOSITORY_ONLY) {
        expect(built, `${artifact} must not carry ${symbol}`).not.toContain(symbol);
      }
    }
  });

  it('the exports map exposes no internal subpath', async () => {
    const exportsMap = (
      JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8')) as {
        exports: Record<string, unknown>;
      }
    ).exports;
    expect(Object.keys(exportsMap).sort()).toEqual(['.', './matchers', './package.json']);
    // The internal entry exists in dist for the repository's recorder
    // scripts (file-path import), but no specifier resolves to it. The
    // variable defeats tsc's static resolution of a non-exported path.
    const specifier = '@rulvar/testing/internal/cassettes';
    await expect(import(specifier)).rejects.toThrow();
  });

  it('the supported tiers stay importable from the root', async () => {
    // Via ../dist: tsc cannot self-reference the package name from
    // inside the package (the evals public-api.test.ts precedent).
    const root = (await import('../dist/index.js')) as Record<string, unknown>;
    for (const name of ['FakeAdapter', 'createTestEngine', 'replayRun', 'runLiveSmoke']) {
      expect(typeof root[name], name).toBe('function');
    }
  });
});
