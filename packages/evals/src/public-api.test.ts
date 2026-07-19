/**
 * Root-surface guard (v1.22.0 review P2-6): the checkpoint rule helpers
 * are public API, so they must be importable from the PACKAGE ROOT, not
 * only from the source module. The changelog had announced
 * `agentTypeRuleHolds` "next to rungRuleHolds" while the barrel never
 * re-exported it. Resolves through the exports map to dist, exactly as
 * a consumer would.
 */
import { describe, expect, it } from 'vitest';

// The DIST entry, the exact artifact the package root's exports map
// serves to consumers (tsc cannot self-reference the package name from
// inside its own source tree; attw, publint, and the install smoke
// cover the exports-map hop itself).
import * as evals from '../dist/index.js';

describe('@rulvar/evals root surface', () => {
  it('exports the measured-value checkpoint API including both rule helpers', () => {
    expect(typeof evals.runValueCheckpoint).toBe('function');
    expect(typeof evals.renderCheckpointReport).toBe('function');
    expect(typeof evals.rungRuleHolds).toBe('function');
    expect(typeof evals.agentTypeRuleHolds).toBe('function');
  });

  it('the two rule helpers agree with their documented shapes', () => {
    const baseline = { n: 4, passRate: 0.5, totalCostUsd: 1 };
    const better = { n: 4, passRate: 0.75, totalCostUsd: 1 };
    expect(evals.agentTypeRuleHolds(baseline, better)).toBe(true);
    expect(evals.agentTypeRuleHolds(better, baseline)).toBe(false);
  });
});
