/**
 * The structural claim map verdicts (RV4305): deterministic code
 * judges STRUCTURE only, and every rule here is a relation a machine
 * can prove: anchor coverage in both directions, the one-non-source
 * row count, the per-grade required blocks. Nothing in this file asks
 * whether a grade is TRUE; that question belongs to the claim judge.
 */
import { describe, expect, it } from 'vitest';

import {
  canonicalClaimMap,
  claimMapHashOf,
  documentAnchorsOf,
  validateClaimMapStructure,
  type ClaimMapRow,
} from './claim-map.js';

const DOC =
  'The audit-write failure does not mask success [src/exec.ts:260]. Deletion cascades ' +
  'over every blob [src/stores.ts:114] and the run meta survives it [src/stores.ts:118].';

const row = (over: Partial<ClaimMapRow> & { id: string }): ClaimMapRow => ({
  claim: 'a claim',
  grade: 'source',
  sourceAnchors: [],
  ...over,
});

describe('validateClaimMapStructure (RV4305)', () => {
  it('accepts the covering map: every document anchor covered, every map anchor real', () => {
    const verdict = validateClaimMapStructure(
      [
        row({ id: 'c1', sourceAnchors: ['src/exec.ts:260'] }),
        row({ id: 'c2', sourceAnchors: ['src/stores.ts:114', 'src/stores.ts:118'] }),
      ],
      DOC,
    );
    expect(verdict).toEqual({ ok: true });
  });

  it('a compound phrase resolves as one non-source row per anchor; two refuse BY ANCHOR', () => {
    // The P2.1 shape: one inference leaning on an anchor beside source
    // rows is legal; a second non-source row on the SAME anchor is the
    // structural overload the validator names.
    const ok = validateClaimMapStructure(
      [
        row({ id: 'c1', sourceAnchors: ['src/exec.ts:260'] }),
        row({
          id: 'c2',
          grade: 'inference',
          sourceAnchors: ['src/stores.ts:114', 'src/stores.ts:118'],
          inference: { premises: ['cascade covers blobs', 'meta survives'], reasoning: 'so' },
        }),
      ],
      DOC,
    );
    expect(ok.ok).toBe(true);
    const overloaded = validateClaimMapStructure(
      [
        row({ id: 'c1', sourceAnchors: ['src/exec.ts:260', 'src/stores.ts:118'] }),
        row({
          id: 'c2',
          grade: 'inference',
          sourceAnchors: ['src/stores.ts:114'],
          inference: { premises: ['p'], reasoning: 'r' },
        }),
        row({
          id: 'c3',
          grade: 'inference',
          sourceAnchors: ['src/stores.ts:114'],
          inference: { premises: ['p2'], reasoning: 'r2' },
        }),
      ],
      DOC,
    );
    expect(overloaded.ok).toBe(false);
    if (!overloaded.ok) {
      expect(overloaded.reasons.join('\n')).toMatch(
        /at most one non-source row.*src\/stores\.ts:114 \(rows c2, c3\)/s,
      );
    }
  });

  it("an unmarked assumption refuses with 'declare assumption' by row id", () => {
    const verdict = validateClaimMapStructure(
      [
        row({ id: 'c1', sourceAnchors: ['src/exec.ts:260'] }),
        row({ id: 'c2', sourceAnchors: ['src/stores.ts:114', 'src/stores.ts:118'] }),
        row({ id: 'arch', grade: 'inference', inference: { premises: ['p'], reasoning: 'r' } }),
      ],
      DOC,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reasons.join('\n')).toMatch(/must declare grade 'assumption': arch/);
    }
  });

  it('bidirectional coverage: uncovered document anchors and phantom map anchors both refuse', () => {
    const uncovered = validateClaimMapStructure(
      [row({ id: 'c1', sourceAnchors: ['src/exec.ts:260'] })],
      DOC,
    );
    expect(uncovered.ok).toBe(false);
    if (!uncovered.ok) {
      expect(uncovered.reasons.join('\n')).toMatch(
        /document cites anchors the map never covers: src\/stores\.ts:114, src\/stores\.ts:118/,
      );
    }
    const phantom = validateClaimMapStructure(
      [
        row({ id: 'c1', sourceAnchors: ['src/exec.ts:260'] }),
        row({ id: 'c2', sourceAnchors: ['src/stores.ts:114', 'src/stores.ts:118'] }),
        row({ id: 'c3', sourceAnchors: ['src/ghost.ts:1'] }),
      ],
      DOC,
    );
    expect(phantom.ok).toBe(false);
    if (!phantom.ok) {
      expect(phantom.reasons.join('\n')).toMatch(
        /map cites anchors the document never carries: src\/ghost\.ts:1/,
      );
    }
  });

  it('the per-grade required blocks hold in both directions', () => {
    const verdict = validateClaimMapStructure(
      [
        row({ id: 'no-bridge', grade: 'inference', sourceAnchors: ['src/exec.ts:260'] }),
        row({
          id: 'stray-bridge',
          sourceAnchors: ['src/stores.ts:114'],
          inference: { premises: ['p'], reasoning: 'r' },
        }),
        row({ id: 'no-evidence', grade: 'live-observed', sourceAnchors: ['src/stores.ts:118'] }),
        row({ id: 'bare-source', grade: 'source' }),
        row({ id: 'anchored-assumption', grade: 'assumption', sourceAnchors: ['src/exec.ts:260'] }),
        row({ id: 'dup', grade: 'assumption' }),
        row({ id: 'dup', grade: 'assumption' }),
      ],
      DOC,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      const joined = verdict.reasons.join('\n');
      expect(joined).toMatch(/'inference' requires the inference block.*no-bridge/);
      expect(joined).toMatch(
        /inference block belongs only on grade 'inference' rows: stray-bridge/,
      );
      expect(joined).toMatch(/'live-observed' requires runEvidence.*no-evidence/);
      expect(joined).toMatch(/'source' requires at least one sourceAnchor: bare-source/);
      expect(joined).toMatch(/must carry no sourceAnchors.*anchored-assumption/);
      expect(joined).toMatch(/ids must be unique; duplicated: dup/);
    }
  });

  it('canonical form sorts by id and the hash names exactly those bytes', () => {
    const a = row({ id: 'b', sourceAnchors: ['src/exec.ts:260'] });
    const b = row({ id: 'a', grade: 'assumption' });
    expect(canonicalClaimMap([a, b]).map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(claimMapHashOf([a, b])).toBe(claimMapHashOf([b, a]));
    expect(claimMapHashOf([a, b])).toMatch(/^[0-9a-f]{64}$/);
    expect(claimMapHashOf([a])).not.toBe(claimMapHashOf([a, b]));
  });

  it('documentAnchorsOf extracts distinct anchors in order under the audit pattern', () => {
    expect(documentAnchorsOf(DOC)).toEqual([
      'src/exec.ts:260',
      'src/stores.ts:114',
      'src/stores.ts:118',
    ]);
    expect(documentAnchorsOf('no anchors here')).toEqual([]);
  });
});
