/**
 * The fault-injection kit (RV811): the branches the comparison
 * experiments never drove live stop being a list of untested claims.
 * Every scenario DELIBERATELY drives one such branch on the real engine
 * with scripted adapters, verifies the documented typed outcome, and
 * leaves experiment-grade artifacts; a branch that stops producing its
 * documented observable reports matched false, fail closed.
 */
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FAULT_SCENARIO_NAMES, runFaultInjection } from './fault-injection.js';

const EXPECTED = [
  'in-flight-exposure-refusal',
  'duplicate-quota-rule',
  'torn-jsonl-tail',
  'glued-jsonl-tail',
  'crash-resume-settle-boundary',
  'pricing-rotation-uncovered-tail',
  'unknown-provider-id',
];

describe('the fault-injection kit (RV811)', () => {
  it('every scenario drives its branch and matches the documented typed outcome', async () => {
    const report = await runFaultInjection();
    expect(report.scenarios.map((s) => s.scenario)).toEqual(EXPECTED);
    for (const scenario of report.scenarios) {
      expect(
        scenario.observation.matched,
        `${scenario.scenario}: ${scenario.observation.detail}`,
      ).toBe(true);
      expect(scenario.artifacts.length).toBeGreaterThan(0);
      expect(scenario.doctrine.length).toBeGreaterThan(0);
    }
    expect(report.allMatched).toBe(true);
    expect(FAULT_SCENARIO_NAMES).toEqual(EXPECTED);

    const byName = new Map(report.scenarios.map((s) => [s.scenario, s]));
    // The typed observables, pinned by content so a scenario that quietly
    // stops driving its branch cannot keep reporting success.
    expect(byName.get('in-flight-exposure-refusal')?.observation.detail).toContain(
      'in flight exposure cap reached',
    );
    expect(byName.get('duplicate-quota-rule')?.observation.detail).toContain('duplicate');
    expect(byName.get('torn-jsonl-tail')?.observation.detail).toContain('salvaged');
    expect(byName.get('glued-jsonl-tail')?.observation.detail).toContain('glued');
    expect(byName.get('crash-resume-settle-boundary')?.observation.detail).toContain('liveCalls=1');
    expect(byName.get('pricing-rotation-uncovered-tail')?.observation.detail).toContain('unpriced');
    expect(byName.get('unknown-provider-id')?.observation.detail).toContain('ghost');
  });

  it('writes experiment-grade artifacts when a directory is given, and only runs the named subset', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-fault-kit-'));
    const report = await runFaultInjection({
      artifactsDir: dir,
      only: ['torn-jsonl-tail', 'unknown-provider-id'],
    });
    expect(report.scenarios).toHaveLength(2);
    expect(report.allMatched).toBe(true);
    const files = readdirSync(dir);
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(report.artifactFiles?.length).toBeGreaterThanOrEqual(2);
    for (const file of report.artifactFiles ?? []) {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
        scenario?: string;
        observation?: { matched?: boolean };
      };
      expect(typeof parsed.scenario).toBe('string');
      expect(parsed.observation?.matched).toBe(true);
    }
  });

  it('refuses an unknown scenario name typed', async () => {
    await expect(runFaultInjection({ only: ['no-such-branch'] })).rejects.toThrow(
      /unknown fault scenario/,
    );
  });
});
