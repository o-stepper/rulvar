/**
 * The capacity sheet (RV4304): every figure labeled with provenance,
 * observed measurements never folded into declared arithmetic,
 * throughput derived only from real service inputs, and the unknown
 * coordination term a NAMED assumption instead of a silent zero.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { capacitySheet, renderCapacitySheetMarkdown } from './capacity-sheet.js';

/**
 * The sixth comparison run's shape: a static 32/34 declared estimate
 * beside 122 observed physical wires that the run's answer presented
 * as one undifferentiated set of numbers.
 */
const SIXTH_RUN = () => ({
  plan: {
    children: 4,
    turnsPerChild: 7,
    synthesisWires: 1,
    judgeWires: 1,
    citationJudgeWires: 1,
    extractWires: 1,
  },
  observed: { source: 'invoice', physicalWireRequests: 122 },
});

describe('capacitySheet (RV4304)', () => {
  it('keeps the static 32/34 and the observed 122 in different sections with different provenance', () => {
    const sheet = capacitySheet(SIXTH_RUN());
    expect(sheet.basis).toBe('declared-estimate');
    expect(sheet.estimate.baseWires).toBe(32);
    expect(sheet.estimate.wiresWithRound).toBe(34);
    const plan = sheet.sections.find((section) => section.name === 'declared plan');
    const observed = sheet.sections.find((section) => section.name.startsWith('observed run'));
    expect(plan).toBeDefined();
    expect(observed).toBeDefined();
    expect(plan?.figures.find((figure) => figure.name === 'baseWires')).toMatchObject({
      value: 32,
      provenance: 'derived',
    });
    expect(plan?.figures.find((figure) => figure.name === 'wiresWithRound')).toMatchObject({
      value: 34,
      provenance: 'derived',
    });
    expect(observed?.figures).toEqual([
      {
        name: 'physicalWireRequests',
        value: 122,
        unit: 'wires',
        provenance: 'observed',
        note: 'measured: invoice',
      },
    ]);
    // The separation is structural: no observed figure in the declared
    // section, no declared figure in the observed one.
    expect(plan?.figures.every((figure) => figure.provenance !== 'observed')).toBe(true);
    expect(observed?.figures.every((figure) => figure.provenance === 'observed')).toBe(true);
  });

  it('names the undeclared coordination term as an assumption, never a silent zero', () => {
    const sheet = capacitySheet(SIXTH_RUN());
    expect(sheet.assumptions.some((line) => line.startsWith('coordination wires:'))).toBe(true);
    const declared = capacitySheet({
      plan: { ...SIXTH_RUN().plan, coordinationWires: 5 },
    });
    expect(declared.assumptions.some((line) => line.startsWith('coordination wires:'))).toBe(false);
    expect(declared.estimate.baseWires).toBe(37);
  });

  it('derives throughput ONLY when concurrency and service time are both given', () => {
    const withoutService = capacitySheet(SIXTH_RUN());
    expect(withoutService.assumptions.some((line) => line.startsWith('throughput:'))).toBe(true);
    const halfDeclared = capacitySheet({
      ...SIXTH_RUN(),
      service: { concurrency: 4 },
    });
    expect(halfDeclared.assumptions.some((line) => line.startsWith('throughput:'))).toBe(true);
    expect(
      halfDeclared.sections
        .find((section) => section.name === 'service model')
        ?.figures.some((figure) => figure.name === 'steadyStateThroughput'),
    ).toBe(false);
    const full = capacitySheet({
      ...SIXTH_RUN(),
      service: { concurrency: 4, serviceTimeMsPerWire: 12000 },
    });
    const service = full.sections.find((section) => section.name === 'service model');
    expect(
      service?.figures.find((figure) => figure.name === 'steadyStateThroughput'),
    ).toMatchObject({ value: 20, unit: 'wires-per-minute', provenance: 'derived' });
    const envelope = service?.figures.find((figure) => figure.name === 'worstCaseEnvelopeMs');
    expect(envelope).toMatchObject({ value: 102000, provenance: 'derived' });
    expect(envelope?.note).toMatch(/NOT a measured percentile/);
    expect(full.assumptions.some((line) => line.startsWith('throughput:'))).toBe(false);
  });

  it('economics derive from givens; junk and unknown keys refuse typed', () => {
    const sheet = capacitySheet({
      ...SIXTH_RUN(),
      economics: { estCostPerWireUsd: 0.1, budgetUsd: 10 },
    });
    const economics = sheet.sections.find((section) => section.name === 'economics');
    expect(
      economics?.figures.find((figure) => figure.name === 'estCostWithRoundUsd'),
    ).toMatchObject({ value: 3.4000000000000004, provenance: 'derived' });
    expect(() => capacitySheet({ ...SIXTH_RUN(), turbo: true } as never)).toThrow(
      /does not know the key 'turbo'/,
    );
    expect(() => capacitySheet({ ...SIXTH_RUN(), economics: { estCostPerWireUsd: -1 } })).toThrow(
      ConfigError,
    );
    expect(() =>
      capacitySheet({ ...SIXTH_RUN(), observed: { physicalWireRequests: 122 } } as never),
    ).toThrow(/observed\.source must name where the numbers were measured/);
  });

  it('renders every line with its provenance label, assumptions last', () => {
    const rendered = renderCapacitySheetMarkdown(
      capacitySheet({
        ...SIXTH_RUN(),
        retries: 2,
        economics: { estCostPerWireUsd: 0.1 },
      }),
    );
    const figureLines = rendered
      .split('\n')
      .filter((line) => line.startsWith('- ') && !line.startsWith('- [assumption]'));
    expect(figureLines.length).toBeGreaterThan(5);
    for (const line of figureLines) {
      expect(line).toMatch(/\[(given|derived|observed)\]/);
    }
    expect(rendered).toMatch(/- children: 4 count \[given\]/);
    expect(rendered).toMatch(/- turnsPerChild: 7 count \[given\]/);
    expect(rendered).toMatch(/- baseWires: 32 wires \[derived\]/);
    expect(rendered).toMatch(
      /- physicalWireRequests: 122 wires \[observed\] \(measured: invoice\)/,
    );
    expect(rendered).toMatch(/- \[assumption\] coordination wires:/);
    expect(rendered).toMatch(/- \[assumption\] throughput:/);
    // No percentile language anywhere: nothing was measured to earn it.
    expect(rendered).not.toMatch(/percentile(?!\))/i);
    expect(rendered).not.toMatch(/\bp95\b/);
  });

  it('a declared repair pool rides the plan as givens and the ceiling as a derived row (RV4705)', () => {
    const sheet = capacitySheet({
      plan: {
        ...SIXTH_RUN().plan,
        maxTotalRepairRounds: 3,
        maxSemanticRepairRounds: 1,
      },
    });
    const plan = sheet.sections.find((section) => section.name === 'declared plan');
    expect(plan?.figures.find((figure) => figure.name === 'maxTotalRepairRounds')).toMatchObject({
      value: 3,
      provenance: 'given',
    });
    expect(plan?.figures.find((figure) => figure.name === 'maxSemanticRepairRounds')).toMatchObject(
      { value: 1, provenance: 'given' },
    );
    // Legacy round delta 2 (no posture declared) plus two mechanical
    // grants past the reserve.
    expect(plan?.figures.find((figure) => figure.name === 'repairWiresCeiling')).toMatchObject({
      value: 4,
      provenance: 'derived',
    });
    // Undeclared pool: no row, exactly the estimate's absent field.
    const bare = capacitySheet(SIXTH_RUN());
    expect(
      bare.sections
        .find((section) => section.name === 'declared plan')
        ?.figures.some((figure) => figure.name === 'repairWiresCeiling'),
    ).toBe(false);
  });
});
