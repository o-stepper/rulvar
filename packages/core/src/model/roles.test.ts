/**
 * Role trigger protocol unit tests (M4-T01): one block per trigger rule
 * (M4-T01 acceptance).
 */
import { describe, expect, it } from 'vitest';

import {
  atCompactionThreshold,
  canRideLoopTurn,
  finalizeFires,
  needsSeparateExtract,
  roleConfiguredInRouting,
  type ExtractNecessityInput,
} from './roles.js';
import type { ResolutionLayer } from './router.js';

const RIDE_BASE: ExtractNecessityInput = {
  schemaSet: true,
  loopRef: 'fake:model-a',
  extractRef: 'fake:model-a',
  loopTier: 'native',
  toolsAvailable: false,
  finalizeRouted: false,
};

describe('canRideLoopTurn', () => {
  it('native and prompt ride regardless of tool availability', () => {
    expect(canRideLoopTurn('native', true)).toBe(true);
    expect(canRideLoopTurn('native', false)).toBe(true);
    expect(canRideLoopTurn('prompt', true)).toBe(true);
    expect(canRideLoopTurn('prompt', false)).toBe(true);
  });

  it('forced-tool rides only when no tools are available (toolChoice would pin)', () => {
    expect(canRideLoopTurn('forced-tool', false)).toBe(true);
    expect(canRideLoopTurn('forced-tool', true)).toBe(false);
  });
});

describe('needsSeparateExtract', () => {
  it('never fires without a schema', () => {
    expect(
      needsSeparateExtract({
        ...RIDE_BASE,
        schemaSet: false,
        extractRef: 'fake:model-b',
        loopTier: 'forced-tool',
        toolsAvailable: true,
        finalizeRouted: true,
      }),
    ).toBe(false);
  });

  it('rides the last loop turn when the loop model serves the tier (acceptance: no extra call)', () => {
    expect(needsSeparateExtract(RIDE_BASE)).toBe(false);
    expect(needsSeparateExtract({ ...RIDE_BASE, loopTier: 'prompt', toolsAvailable: true })).toBe(
      false,
    );
    // forced-tool with NO tools is the M1 single-shot shape: it rides.
    expect(needsSeparateExtract({ ...RIDE_BASE, loopTier: 'forced-tool' })).toBe(false);
  });

  it('fires when routing directs extract to a different model', () => {
    expect(needsSeparateExtract({ ...RIDE_BASE, extractRef: 'fake:model-b' })).toBe(true);
  });

  it('fires when the required tier cannot ride a tools-available turn', () => {
    expect(
      needsSeparateExtract({ ...RIDE_BASE, loopTier: 'forced-tool', toolsAvailable: true }),
    ).toBe(true);
  });

  it('fires when finalize is routed: the schema rides neither loop nor synthesis', () => {
    expect(needsSeparateExtract({ ...RIDE_BASE, finalizeRouted: true })).toBe(true);
  });
});

describe('roleConfiguredInRouting', () => {
  const withFinalize: ResolutionLayer = { routing: { finalize: 'fake:strong' } };
  const withoutFinalize: ResolutionLayer = { routing: { extract: 'fake:cheap' } };
  const modelOnly: ResolutionLayer = { model: 'fake:model-a' };

  it('detects the role at any layer', () => {
    expect(roleConfiguredInRouting('finalize', [withFinalize, undefined, undefined])).toBe(true);
    expect(roleConfiguredInRouting('finalize', [undefined, withoutFinalize, withFinalize])).toBe(
      true,
    );
  });

  it('an all-roles model never summons a routed role', () => {
    expect(roleConfiguredInRouting('finalize', [modelOnly, withoutFinalize, undefined])).toBe(
      false,
    );
    expect(roleConfiguredInRouting('finalize', [])).toBe(false);
  });
});

describe('finalizeFires', () => {
  it('fires only when routed AND tools are available', () => {
    expect(finalizeFires({ routed: true, toolsAvailable: true })).toBe(true);
    expect(finalizeFires({ routed: true, toolsAvailable: false })).toBe(false);
    expect(finalizeFires({ routed: false, toolsAvailable: true })).toBe(false);
    expect(finalizeFires({ routed: false, toolsAvailable: false })).toBe(false);
  });
});

describe('atCompactionThreshold (summarize trigger)', () => {
  it('trips at and above the threshold fraction of the context window', () => {
    expect(atCompactionThreshold(79_999, 100_000, 0.8)).toBe(false);
    expect(atCompactionThreshold(80_000, 100_000, 0.8)).toBe(true);
    expect(atCompactionThreshold(100_000, 100_000, 0.8)).toBe(true);
  });

  it('never trips on a missing or zero context window', () => {
    expect(atCompactionThreshold(1_000_000, 0, 0.8)).toBe(false);
    expect(atCompactionThreshold(1_000_000, -1, 0.8)).toBe(false);
  });
});
