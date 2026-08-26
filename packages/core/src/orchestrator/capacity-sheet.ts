/**
 * The capacity sheet (RV4304, P2.2 of the sixth comparison
 * experiment's improvement plan): a structured artifact that answers
 * "what will this plan cost and sustain" with EVERY figure carrying
 * its provenance, because the experiment's answer presented a static
 * 32/34 declared estimate and the run's 122 observed physical wires
 * as one undifferentiated set of numbers, derived a throughput no
 * declared input could support, and called a shaped envelope a
 * percentile with no data behind it.
 *
 * The rules the sheet enforces by construction:
 *
 * - Every figure is `'given'` (a declared input, echoed), `'derived'`
 *   (computed from givens by a formula named in the note),
 *   `'assumption'` (named, never a silent zero), or `'observed'` (a
 *   measurement, carrying its source, never mixed into a declared
 *   section).
 * - Throughput derives ONLY when concurrency AND service time are
 *   both given; otherwise it is a NAMED assumption, because wire
 *   counts alone bound nothing per unit time.
 * - An undeclared coordination term is a named assumption, not a zero:
 *   the sixth run's model silently excluded the loop.
 * - The worst-case envelope is a shaped bound and says so; nothing in
 *   the sheet is called a percentile, because no percentile exists
 *   without measurements.
 */
import { ConfigError } from '../l0/errors.js';
import {
  retryWireMultiplier,
  wireCapacityEstimate,
  type WireCapacityEstimate,
  type WireCapacitySpec,
} from './admission.js';

/** The unit vocabulary of a sheet figure; closed on purpose. */
export type CapacitySheetUnit =
  'wires' | 'usd' | 'ms' | 'wires-per-minute' | 'percent' | 'count' | 'ratio';

/** One figure of the sheet: a number, its unit, and where it came from. */
export interface CapacitySheetFigure {
  name: string;
  value: number;
  unit: CapacitySheetUnit;
  provenance: 'given' | 'derived' | 'assumption' | 'observed';
  /** The formula, the source, or the assumption's own statement. */
  note?: string;
}

/** One titled section; observed figures never share one with declared. */
export interface CapacitySheetSection {
  name: string;
  figures: CapacitySheetFigure[];
}

/** The closed input schema of the sheet (RV4304). */
export interface CapacitySheetSpec {
  /** The declared plan; the sheet embeds {@link wireCapacityEstimate}. */
  plan: WireCapacitySpec;
  /** Expected transport retries against the base ({@link retryWireMultiplier}). */
  retries?: number;
  service?: {
    /** Concurrent wires in flight. */
    concurrency?: number;
    /** Mean service time of ONE wire, milliseconds. */
    serviceTimeMsPerWire?: number;
  };
  economics?: {
    /** Declared mean cost of one wire. */
    estCostPerWireUsd?: number;
    /** The run's declared ceiling. */
    budgetUsd?: number;
  };
  /**
   * Measured facts of a RUN (the invoice, the telemetry), rendered in
   * their own section with their source on every row and never folded
   * into the declared arithmetic: 122 observed wires beside a declared
   * 34 is a finding about the declaration, not an input to it.
   */
  observed?: {
    /** Where the numbers were measured: 'invoice', 'telemetry', a report name. */
    source: string;
    physicalWireRequests?: number;
    totalUsd?: number;
    wallMs?: number;
  };
}

/** The sheet: sections of labeled figures plus the named assumptions. */
export interface CapacitySheet {
  /** The provenance of the whole artifact, the RV4206 literal. */
  basis: 'declared-estimate';
  /** The embedded estimate, verbatim, for machine consumers. */
  estimate: WireCapacityEstimate;
  sections: CapacitySheetSection[];
  /** Named assumptions; never silently zero, never silently derived. */
  assumptions: string[];
}

function requireFiniteNonNegative(value: unknown, site: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ConfigError(`${site} must be a finite non-negative number; got ${String(value)}`);
  }
  return value;
}

function requireClosedKeys(
  value: Record<string, unknown>,
  known: readonly string[],
  site: string,
): void {
  for (const key of Object.keys(value)) {
    if (!known.includes(key)) {
      throw new ConfigError(
        `${site} does not know the key '${key}'; the declared vocabulary is ${known.join(', ')}`,
      );
    }
  }
}

/**
 * Builds the capacity sheet from the closed spec (RV4304). Pure and
 * deterministic; throws typed on junk. See the module doc for the
 * provenance rules it enforces.
 */
export function capacitySheet(spec: CapacitySheetSpec): CapacitySheet {
  if (typeof spec !== 'object' || spec === null) {
    throw new ConfigError(`capacitySheet spec must be an object; got ${JSON.stringify(spec)}`);
  }
  requireClosedKeys(
    spec as unknown as Record<string, unknown>,
    ['plan', 'retries', 'service', 'economics', 'observed'],
    'capacitySheet',
  );
  const estimate = wireCapacityEstimate(spec.plan);
  const assumptions: string[] = [];
  const sections: CapacitySheetSection[] = [];

  // ---- Declared plan: givens echoed, the estimate derived.
  const planFigures: CapacitySheetFigure[] = [];
  const given = (name: string, value: number | undefined, unit: CapacitySheetUnit): void => {
    if (value !== undefined) {
      planFigures.push({ name, value, unit, provenance: 'given' });
    }
  };
  given('children', spec.plan.children, 'count');
  given('turnsPerChild', spec.plan.turnsPerChild, 'count');
  given('childWires', spec.plan.childWires, 'wires');
  given('coordinationWires', spec.plan.coordinationWires, 'wires');
  given('synthesisWires', spec.plan.synthesisWires, 'wires');
  given('judgeWires', spec.plan.judgeWires, 'wires');
  given('citationJudgeWires', spec.plan.citationJudgeWires, 'wires');
  given('extractWires', spec.plan.extractWires, 'wires');
  given('maxTotalRepairRounds', spec.plan.maxTotalRepairRounds, 'count');
  given('maxSemanticRepairRounds', spec.plan.maxSemanticRepairRounds, 'count');
  if (spec.plan.coordinationWires === undefined) {
    // The named assumption, not a zero (RV4304): the sixth run's
    // model silently excluded the loop and answered anyway.
    assumptions.push(
      'coordination wires: not declared; the base EXCLUDES the coordination loop ' +
        '(declare coordinationWires to include it)',
    );
  }
  planFigures.push(
    {
      name: 'baseWires',
      value: estimate.baseWires,
      unit: 'wires',
      provenance: 'derived',
      note: 'sum of the declared stages (wireCapacityEstimate)',
    },
    {
      name: 'repairRoundDeltaWires',
      value: estimate.repairRoundDeltaWires,
      unit: 'wires',
      provenance: 'derived',
      note:
        spec.plan.claimStage !== undefined ||
        spec.plan.claimOnFound !== undefined ||
        spec.plan.citationOnFound !== undefined ||
        spec.plan.claimConfigured !== undefined
          ? 'from the declared posture (semanticRoundArming, the acceptance-tail arithmetic)'
          : 'legacy constant: assume one single-judge round (no posture declared)',
    },
    {
      name: 'wiresWithRound',
      value: estimate.wiresWithRound,
      unit: 'wires',
      provenance: 'derived',
      note: 'baseWires + repairRoundDeltaWires',
    },
    {
      name: 'roundOverheadShare',
      value: estimate.roundOverheadShare * 100,
      unit: 'percent',
      provenance: 'derived',
      note: 'repairRoundDeltaWires / baseWires',
    },
  );
  if (estimate.repairWiresCeiling !== undefined) {
    // The pool-bounded worst case (RV4705): present exactly when the
    // plan declared its run repair pool, so a sheet without the row
    // still says nothing it cannot know.
    planFigures.push({
      name: 'repairWiresCeiling',
      value: estimate.repairWiresCeiling,
      unit: 'wires',
      provenance: 'derived',
      note:
        'pool-bounded repair worst case: the round beside the mechanical grants the pool still ' +
        'holds, or the all-mechanical pool, whichever costs more wires',
    });
  }
  if (spec.retries !== undefined) {
    requireFiniteNonNegative(spec.retries, 'capacitySheet retries');
    planFigures.push({ name: 'retries', value: spec.retries, unit: 'wires', provenance: 'given' });
    if (estimate.baseWires > 0) {
      planFigures.push({
        name: 'retryMultiplier',
        value: retryWireMultiplier(estimate.baseWires, spec.retries),
        unit: 'ratio',
        provenance: 'derived',
        note: '1 + retries / baseWires (retryWireMultiplier)',
      });
    }
  }
  sections.push({ name: 'declared plan', figures: planFigures });

  // ---- Service model: throughput derives only from BOTH inputs.
  const service = spec.service;
  if (service !== undefined) {
    requireClosedKeys(service, ['concurrency', 'serviceTimeMsPerWire'], 'capacitySheet service');
  }
  const concurrency = service?.concurrency;
  const serviceTime = service?.serviceTimeMsPerWire;
  const serviceFigures: CapacitySheetFigure[] = [];
  if (concurrency !== undefined) {
    requireFiniteNonNegative(concurrency, 'capacitySheet service.concurrency');
    serviceFigures.push({
      name: 'concurrency',
      value: concurrency,
      unit: 'count',
      provenance: 'given',
    });
  }
  if (serviceTime !== undefined) {
    requireFiniteNonNegative(serviceTime, 'capacitySheet service.serviceTimeMsPerWire');
    serviceFigures.push({
      name: 'serviceTimeMsPerWire',
      value: serviceTime,
      unit: 'ms',
      provenance: 'given',
    });
  }
  if (
    concurrency !== undefined &&
    serviceTime !== undefined &&
    concurrency > 0 &&
    serviceTime > 0
  ) {
    serviceFigures.push(
      {
        name: 'steadyStateThroughput',
        value: (concurrency * 60000) / serviceTime,
        unit: 'wires-per-minute',
        provenance: 'derived',
        note: 'concurrency * 60000 / serviceTimeMsPerWire',
      },
      {
        name: 'worstCaseEnvelopeMs',
        value: (estimate.wiresWithRound * serviceTime) / concurrency,
        unit: 'ms',
        provenance: 'derived',
        note:
          'wiresWithRound * serviceTimeMsPerWire / concurrency; a shaped bound, NOT a ' +
          'measured percentile',
      },
    );
  } else {
    // Wire counts alone bound nothing per unit time (RV4304): the
    // absence is a named assumption, never a derived number.
    assumptions.push(
      'throughput: not derivable; concurrency and serviceTimeMsPerWire must BOTH be given ' +
        '(wire counts alone bound nothing per unit time)',
    );
  }
  if (serviceFigures.length > 0) {
    sections.push({ name: 'service model', figures: serviceFigures });
  }

  // ---- Economics: declared prices, derived totals.
  const economics = spec.economics;
  if (economics !== undefined) {
    requireClosedKeys(economics, ['estCostPerWireUsd', 'budgetUsd'], 'capacitySheet economics');
    const economicsFigures: CapacitySheetFigure[] = [];
    if (economics.estCostPerWireUsd !== undefined) {
      requireFiniteNonNegative(
        economics.estCostPerWireUsd,
        'capacitySheet economics.estCostPerWireUsd',
      );
      economicsFigures.push({
        name: 'estCostPerWireUsd',
        value: economics.estCostPerWireUsd,
        unit: 'usd',
        provenance: 'given',
      });
      economicsFigures.push({
        name: 'estCostWithRoundUsd',
        value: estimate.wiresWithRound * economics.estCostPerWireUsd,
        unit: 'usd',
        provenance: 'derived',
        note: 'wiresWithRound * estCostPerWireUsd',
      });
    }
    if (economics.budgetUsd !== undefined) {
      requireFiniteNonNegative(economics.budgetUsd, 'capacitySheet economics.budgetUsd');
      economicsFigures.push({
        name: 'budgetUsd',
        value: economics.budgetUsd,
        unit: 'usd',
        provenance: 'given',
      });
    }
    if (economicsFigures.length > 0) {
      sections.push({ name: 'economics', figures: economicsFigures });
    }
  }

  // ---- Observed run: measurements only, source on every row, never
  // folded into the declared arithmetic above.
  const observed = spec.observed;
  if (observed !== undefined) {
    requireClosedKeys(
      observed,
      ['source', 'physicalWireRequests', 'totalUsd', 'wallMs'],
      'capacitySheet observed',
    );
    if (typeof observed.source !== 'string' || observed.source.length === 0) {
      throw new ConfigError(
        'capacitySheet observed.source must name where the numbers were measured ' +
          "('invoice', 'telemetry', a report name)",
      );
    }
    const observedFigures: CapacitySheetFigure[] = [];
    const measured = (name: string, value: number | undefined, unit: CapacitySheetUnit): void => {
      if (value !== undefined) {
        requireFiniteNonNegative(value, `capacitySheet observed.${name}`);
        observedFigures.push({
          name,
          value,
          unit,
          provenance: 'observed',
          note: `measured: ${observed.source}`,
        });
      }
    };
    measured('physicalWireRequests', observed.physicalWireRequests, 'wires');
    measured('totalUsd', observed.totalUsd, 'usd');
    measured('wallMs', observed.wallMs, 'ms');
    if (observedFigures.length > 0) {
      sections.push({ name: `observed run (${observed.source})`, figures: observedFigures });
    }
  }

  return { basis: 'declared-estimate', estimate, sections, assumptions };
}

/**
 * Renders the sheet as Markdown: one heading per section, one line per
 * figure with its provenance label on the line, and the named
 * assumptions last. A reader who quotes any single line quotes its
 * provenance with it; that is the point.
 */
export function renderCapacitySheetMarkdown(sheet: CapacitySheet): string {
  const lines: string[] = ['# Capacity sheet', '', `Basis: ${sheet.basis}.`, ''];
  for (const section of sheet.sections) {
    lines.push(`## ${section.name}`, '');
    for (const figure of section.figures) {
      const value = Number.isInteger(figure.value) ? String(figure.value) : figure.value.toFixed(4);
      lines.push(
        `- ${figure.name}: ${value} ${figure.unit} [${figure.provenance}]` +
          (figure.note === undefined ? '' : ` (${figure.note})`),
      );
    }
    lines.push('');
  }
  lines.push('## assumptions', '');
  if (sheet.assumptions.length === 0) {
    lines.push('- none: every figure above is given, derived, or observed');
  } else {
    for (const assumption of sheet.assumptions) {
      lines.push(`- [assumption] ${assumption}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}
