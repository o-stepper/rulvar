/**
 * RunProfile presets as data (M5-T07 acceptance): the shipped presets
 * are pure data (no functions, no named models), and applying one is a
 * data merge. The zero-behavioral-branches assertion is a source scan.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { RUN_PROFILES, runProfile } from './run-profiles.js';

describe('RunProfile presets (M5-T07)', () => {
  it('ships fast/standard/deep/ultra as data lookups', () => {
    expect(Object.keys(RUN_PROFILES).sort()).toEqual(['deep', 'fast', 'standard', 'ultra']);
    expect(runProfile('standard')?.perRunConcurrency).toBe(12);
    expect(runProfile('nope')).toBeUndefined();
  });

  it('presets contain zero functions and zero named model strings', () => {
    for (const [name, profile] of Object.entries(RUN_PROFILES)) {
      const scan = (value: unknown): void => {
        expect(typeof value, `${name} carries a function`).not.toBe('function');
        if (typeof value === 'string') {
          // Data-only: effort/preset words, never provider model ids.
          expect(/claude-|gpt-\d|grok-|gemini-/i.test(value), `${name}: ${value}`).toBe(false);
        }
        if (Array.isArray(value)) {
          value.forEach(scan);
        } else if (typeof value === 'object' && value !== null) {
          Object.values(value).forEach(scan);
        }
      };
      scan(profile);
    }
  });

  it('escalate progressively in effort and depth', () => {
    expect(RUN_PROFILES.fast?.effortByRole?.orchestrate).toBe('low');
    expect(RUN_PROFILES.ultra?.effortByRole?.orchestrate).toBe('max');
    expect(RUN_PROFILES.fast?.maxDepth).toBeLessThanOrEqual(RUN_PROFILES.ultra?.maxDepth ?? 0);
  });

  it('the engine ships no strategy branch keyed on profile names (data-only)', () => {
    // The presets live in a data module; no engine source may switch on
    // a profile name (docs/06, section 11; EXC registry).
    const engineSrc = readFileSync(new URL('./engine.ts', import.meta.url), 'utf8');
    const ctxSrc = readFileSync(new URL('./ctx.ts', import.meta.url), 'utf8');
    for (const name of Object.keys(RUN_PROFILES)) {
      expect(engineSrc.includes(`'${name}'`), `engine switches on '${name}'`).toBe(false);
      expect(ctxSrc.includes(`'${name}'`), `ctx switches on '${name}'`).toBe(false);
    }
  });
});
