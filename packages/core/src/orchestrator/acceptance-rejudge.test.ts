/**
 * The tenth comparison experiment's acceptance, re judged over its own
 * journal roster (plan 49, wave C1 item 1). The experiment's harness
 * fanned four research specialists out under `all-ok` with the binding
 * evidence floor and the roster floor, and no salvage arm: three
 * settled 'ok' with five verified entries each and one settled 'limit'
 * with nine entries over a floor of four, a finished Markdown report
 * from its finalization reserve turn, and two progress reports before
 * its terminal, because one surplus bookkeeping call died at the tool
 * cap inside the finalization window. The acceptance rejected the
 * finish, the configured synthesis never ran, and the run settled
 * 'error' at 22 percent of its budget. These tests turn the journal's
 * roster into a fixture, drive the same fan out on the scripted adapter
 * so the four children settle with exactly the roster's statuses,
 * entry counts, executed call counts, skipped call and error text, and
 * then decide the same roster three times: the harness acceptance
 * rejects it byte for byte as the journal recorded, the plan's salvage
 * flags accept it as a named partial whose value is the synthesis, and
 * the RV4905 preset's acceptance (spread with onUnreachable 'degrade'
 * the way the cookbook does) accepts it too. No runtime behavior
 * changes here; a pin the runtime does not hold is a defect of the
 * test, never of the runtime.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type { JournalEntry } from '../l0/entries.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine } from '../engine/engine.js';
import type { AgentProfile, EvidenceContract } from '../engine/ctx.js';
import { researchAgentProfile, researchFanOut } from '../engine/profile-templates.js';
import { scriptedAdapter, testCaps, type ScriptedTurn } from '../engine/test-harness.js';
import { orchestrate, type OrchestrateAcceptance } from './orchestrate.js';

/**
 * The roster as the journal recorded it. Provenance: run
 * `rulvar-benchmark-v1252-2026-09-01T10-56-04-591Z` (2026 09 01, rulvar
 * 1.252.0 at 973add91), the kind 'agent' rows seq 60, 65, 69 and 75 in
 * scope 'agent:0' (the coordinator's own terminal is seq 80, status ok,
 * a draft the acceptance never accepted; the acceptance decision is seq
 * 81, the run settle seq 82). A projection, never the reports: the
 * status, the evidence verdict, the tool budget, the terminal error and
 * the report's first heading of each settled specialist. The limit
 * child's report was 8041 characters; it had called report_progress
 * twice before its terminal, so it settled with a terminal output AND a
 * structured partial. The cap is the harness's own 36, not scaled down,
 * so the error text and the executed call counts are the journal's
 * bytes.
 */
interface RosterRow {
  seq: number;
  agentType: string;
  status: 'ok' | 'limit';
  evidence: { recordedEntries: number; minEntries: number; met: boolean };
  toolBudget: { used: number; cap: number };
  error?: { code: 'agent'; message: string; kind: 'terminal' };
  heading: string;
}

const CAP = 36;
const FLOOR = 4;
const LIMIT_MESSAGE = `tool budget exhausted: maxToolCalls (${String(CAP)}/${String(CAP)}); skipped tool calls: 1`;

const ROSTER: readonly RosterRow[] = [
  {
    seq: 60,
    agentType: 'integration-architecture',
    status: 'ok',
    evidence: { recordedEntries: 5, minEntries: FLOOR, met: true },
    toolBudget: { used: 35, cap: CAP },
    heading: '# Integration Architecture Specialist Report',
  },
  {
    seq: 65,
    agentType: 'reliability-economics',
    status: 'ok',
    evidence: { recordedEntries: 5, minEntries: FLOOR, met: true },
    toolBudget: { used: 31, cap: CAP },
    heading: '# Reliability & Economics Specialist Report',
  },
  {
    seq: 69,
    agentType: 'security-operations',
    status: 'limit',
    evidence: { recordedEntries: 9, minEntries: FLOOR, met: true },
    toolBudget: { used: CAP, cap: CAP },
    error: { code: 'agent', message: LIMIT_MESSAGE, kind: 'terminal' },
    heading: '## Security & Operations Specialist Report',
  },
  {
    seq: 75,
    agentType: 'verification-migration',
    status: 'ok',
    evidence: { recordedEntries: 5, minEntries: FLOOR, met: true },
    toolBudget: { used: 35, cap: CAP },
    heading: '# Verification & Migration Specialist Report',
  },
];
const LIMIT_ROW = ROSTER[2];

/**
 * The journal's own rejection: rulvar-outcome.json error.message, the
 * run_settle row seq 82, naming the limit child by its id. The template
 * below is that text with the id and the cap as parameters; the first
 * test proves the template reproduces the journal's bytes.
 */
const JOURNAL_LIMIT_CHILD = '01M1E9SFKW86J6B2FJ6JZJZQKQ';
const JOURNAL_REJECTION =
  "the orchestrator acceptance policy rejected the finish: 3 children settled 'ok' but the " +
  'policy requires every child ok, with at least 4 spawned children; degraded: child ' +
  "01M1E9SFKW86J6B2FJ6JZJZQKQ settled 'limit' (terminal: tool budget exhausted: " +
  'maxToolCalls (36/36); skipped tool calls: 1)';
const rejectionNaming = (child: string): string =>
  "the orchestrator acceptance policy rejected the finish: 3 children settled 'ok' but the " +
  `policy requires every child ok, with at least ${String(FLOOR)} spawned children; degraded: ` +
  `child ${child} settled 'limit' (terminal: ${LIMIT_MESSAGE})`;

/** The harness's acceptance (run-rulvar.mjs), and the plan's re judge over it. */
const HARNESS_ACCEPTANCE: OrchestrateAcceptance = {
  childPolicy: 'all-ok',
  minSpawnedChildren: 4,
  requireEvidenceFloor: true,
};
const REJUDGE_ACCEPTANCE: OrchestrateAcceptance = {
  ...HARNESS_ACCEPTANCE,
  acceptValidatedTerminalOutputOnLimit: true,
  acceptPartialChildren: true,
};

/**
 * The harness's specialist contract and limits, byte for byte, over
 * the research template (maxCallsPerTool, toolUnits and the guards stay
 * the template's, exactly as the harness merged them).
 */
const CONTRACT: EvidenceContract = {
  minEntries: FLOOR,
  estCallsPerEntry: 3,
  overheadCalls: 5,
  enforce: 'refuse',
};
const HARNESS_LIMITS = {
  maxTurns: 16,
  maxToolCalls: CAP,
  maxOutputTokensPerTurn: 12_000,
  finalizationWindow: { reserveCalls: 7, reserveForEvidenceDeficit: true },
  finalizationTurns: { reserveTurns: 2 },
  finalizationReserve: { maxOutputTokens: 8_000 },
};
const CHILD_BUDGET_USD = 1.05;
const CHILD_EST_USD = 0.82;

const ROLES: Record<string, string> = {
  'integration-architecture': 'Integration architecture specialist.',
  'reliability-economics': 'Reliability and economics specialist.',
  'security-operations': 'Security and operations specialist.',
  'verification-migration': 'Verification and migration specialist.',
};
const GOAL =
  'Decide whether this repository is ready for a migration. Spawn the four specialists ' +
  'below in ONE parallel_agents call, wait for every handle, and finish with a draft.\n' +
  Object.entries(ROLES)
    .map(([name, role], index) => `${String(index + 1)}. agentType=${name}; ${role}`)
    .join('\n');
const DRAFT = 'DRAFT: four specialist reports in hand; the RFC follows.';
const RFC = 'RFC: composed over the four specialist reports, citations preserved.';

/** Source files the specialists read; 27 distinct pages keep every read signature fresh. */
const SOURCE_FILES = Array.from(
  { length: 27 },
  (_, index) => `src/module-${String(index + 1).padStart(2, '0')}.ts`,
);

function repository(): string {
  const root = mkdtempSync(join(tmpdir(), 'rulvar-rejudge-'));
  const files: Record<string, string> = {
    'benchmark-question.md': '# Frozen question\n\nIs the repository ready to migrate?\n',
    'docs/guide.md': '# Guide\n\nThe boundary is the journal.\n',
  };
  for (const [index, file] of SOURCE_FILES.entries()) {
    files[file] = `export const module${String(index + 1)} = ${String(index + 1)};\n`;
  }
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), text, 'utf8');
  }
  return root;
}

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function lastUserTextOf(req: ChatRequest): string {
  for (let index = req.messages.length - 1; index >= 0; index -= 1) {
    const msg = req.messages[index];
    if (msg?.role === 'user') {
      const part = msg.parts.find((candidate) => candidate.type === 'text');
      return (part as { text?: string } | undefined)?.text ?? '';
    }
  }
  return '';
}

/** Every text part of a request, joined: the prompt a scripted model saw. */
function textOf(req: ChatRequest): string {
  return req.messages
    .flatMap((msg) => msg.parts)
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

/** Completed tool turns so far: the notices are user messages and never count. */
function toolTurnsOf(req: ChatRequest): number {
  return req.messages.filter((msg) => msg.role === 'tool').length;
}

function handlesIn(req: ChatRequest): number[] {
  const handles: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const result = part.result as { handle?: number; handles?: number[] };
        if (typeof result?.handle === 'number') {
          handles.push(result.handle);
        }
        if (Array.isArray(result?.handles)) {
          handles.push(...result.handles.filter((h): h is number => typeof h === 'number'));
        }
      }
    }
  }
  return handles;
}

/** The result of the named tool as the coordinator saw it, serialized. */
function toolResultIn(req: ChatRequest, name: string): string | undefined {
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result' && part.name === name) {
        return JSON.stringify(part.result);
      }
    }
  }
  return undefined;
}

const reads = (from: number, count: number) =>
  SOURCE_FILES.slice(from, from + count).map((path) => ({ name: 'read_file', args: { path } }));
const records = (name: string, from: number, count: number) =>
  SOURCE_FILES.slice(from, from + count).map((path) => ({
    name: 'record_evidence',
    args: { claim: `${name}: ${path} holds its module constant`, file: path, lines: '1' },
  }));
const progress = (name: string, facts: number) => ({
  name: 'report_progress',
  args: {
    facts: Array.from({ length: facts }, (_, index) => `${name} fact ${String(index + 1)}`),
    evidence: [],
    questions: [],
  },
});
const report = (row: RosterRow): string =>
  `${row.heading}\n\n## Decision\n\nConditional go, on the evidence recorded by ${row.agentType} ` +
  'over the repository sources cited above; every claim is labeled by its verification.';

/**
 * The specialists' scripts, one call plan per roster row, under the
 * harness's cap of 36 and reserve of 7 (the window opens once seven
 * calls remain; inside it only the zero unit bookkeeping tools execute).
 *
 * The limit child follows the security specialist's transcript: 27
 * calls of reading and two progress reports, then a batch of six
 * record_evidence that enters the window on its third call (27 + 2 =
 * 29 used, 7 remaining) and executes whole, then a batch of four
 * record_evidence of which three execute (36/36) and one is skipped,
 * so the terminal is the roster's exact error and the finalization
 * reserve turn produces its report. Nine entries over a floor of four.
 *
 * The ok children read until the window opens (28 or 24 pages), then
 * record their five entries and one progress report inside it and
 * answer with their report: 35, 31 and 35 executed calls, exactly the
 * roster's counts.
 */
function specialistTurn(row: RosterRow, req: ChatRequest): ScriptedTurn {
  if (lastUserTextOf(req).startsWith('The tool budget is exhausted')) {
    return { text: report(row) };
  }
  const turn = toolTurnsOf(req);
  const name = row.agentType;
  if (turn === 0) {
    return { toolCall: { name: 'read_file', args: { path: 'benchmark-question.md' } } };
  }
  if (row.status === 'limit') {
    switch (turn) {
      case 1:
        return {
          toolCalls: [{ name: 'list_files', args: {} }, ...reads(0, 11), progress(name, 2)],
        };
      case 2:
        return { toolCalls: [...reads(11, 12), progress(name, 4)] };
      case 3:
        return { toolCalls: records(name, 0, 6) };
      default:
        return { toolCalls: records(name, 6, 4) };
    }
  }
  const wide = row.toolBudget.used === 35;
  switch (turn) {
    case 1:
      return { toolCalls: [{ name: 'list_files', args: {} }, ...reads(0, wide ? 13 : 11)] };
    case 2:
      return { toolCalls: wide ? reads(13, 14) : reads(11, 12) };
    case 3:
      return { toolCalls: [...records(name, 0, 5), progress(name, 5)] };
    default:
      return { text: report(row) };
  }
}

interface Envelope {
  result: unknown;
  completion: string;
  childStatusCounts: Record<string, number>;
  degradedReasons: string[];
  salvagedPartialChildren?: string[];
  salvagedTerminalOutputChildren?: string[];
  acceptedByDegrade?: true;
  semanticPasses?: { synthesis?: { ran: boolean; reason?: string } };
  childLimitProfile?: Record<string, number>;
}

interface AcceptanceRow {
  child: string;
  status: string;
  salvage?: string;
  error?: { kind: string; message?: string };
  evidence?: { recordedEntries: number; minEntries: number; met: boolean };
}

/** The settled agent row as the journal stores it (the fields the fixture projects). */
interface SettledRow {
  status: string;
  value: unknown;
  evidence?: { recordedEntries: number; minEntries: number; met: boolean };
  evidenceEntries?: unknown[];
  toolBudget?: { used: number; cap?: number; finalizationWindowEntered?: boolean };
  error?: { code: string; message: string; retryable: boolean; data?: { kind?: string } };
}

function decisionsOf(entries: readonly JournalEntry[], decisionType: string): JournalEntry[] {
  return entries.filter(
    (entry) =>
      entry.kind === 'decision' &&
      (entry.value as { decisionType?: string } | undefined)?.decisionType === decisionType,
  );
}

/**
 * The binding constraint profile the acceptance journals (RV4906) for
 * this roster: one cap hit, four window entries, and one child starved
 * at the cap. The scripted adapter is priced at a fraction of a cent, so
 * the money share reads 0 where the experiment's read 0.18 to 0.30; the
 * counts are the experiment's.
 */
const LIMIT_PROFILE = {
  children: 4,
  underToolBudget: 4,
  capHit: 1,
  windowEntered: 4,
  starved: 1,
  budgetUsedShareMedian: 0,
};

/**
 * The fan out under one acceptance: the harness's profiles (its
 * research toolset options, contract and limits), its coordinator
 * options, its single synthesis with context 'full', and the scripted
 * children above. Only the acceptance varies between the three
 * decisions, so the three roster settles are the same by construction;
 * the models are the scripted adapter's, the experiment's effort and
 * model class do not reach the acceptance.
 */
async function runRoster(acceptance: OrchestrateAcceptance, runId: string) {
  const root = repository();
  const kits = Object.fromEntries(
    Object.entries(ROLES).map(([name, description]) => [
      name,
      researchAgentProfile({
        root,
        ignore: ['dist', 'dts-rollup', '.turbo', 'coverage', 'rulvar-state', 'experiments'],
        pageSize: 60,
        readPageChars: 7000,
        evidenceContract: CONTRACT,
        description,
        limits: HARNESS_LIMITS,
      }),
    ]),
  );
  const profiles: Record<string, AgentProfile> = Object.fromEntries(
    Object.entries(kits).map(([name, kit]) => [name, { ...kit.profile, estCost: CHILD_EST_USD }]),
  );
  const caps = testCaps({ maxOutputTokens: 64_000 });
  let orchTurn = 0;
  const captures: { awaited?: string } = {};
  const coordination = scriptedAdapter(
    (req): ScriptedTurn => {
      const agentType = agentTypeOf(req);
      const row = ROSTER.find((candidate) => candidate.agentType === agentType);
      if (row !== undefined) {
        return specialistTurn(row, req);
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: {
            name: 'parallel_agents',
            args: {
              tasks: Object.entries(ROLES).map(([name, role]) => ({
                agentType: name,
                prompt: role,
                budgetUsd: CHILD_BUDGET_USD,
              })),
            },
          },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      captures.awaited = toolResultIn(req, 'await_all');
      return { toolCall: { name: 'finish', args: { result: DRAFT } } };
    },
    { caps },
  );
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: RFC } } }),
    { id: 'synth', caps },
  );
  const store = new InMemoryStore();
  const engine = createEngine({
    adapters: [coordination, synthesis],
    stores: { journal: store },
    defaults: {
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'synth:model' },
      profiles,
      limits: { maxTurns: 18, maxOutputTokensPerTurn: 16_000 },
    },
  });
  const outcome = await orchestrate(
    engine,
    GOAL,
    {
      profiles: Object.keys(ROLES),
      maxSpawns: 4,
      limits: { maxTurns: 14, maxToolCalls: 28, maxOutputTokensPerTurn: 15_000 },
      budget: {
        capUsd: 2.35,
        capFraction: 1,
        finalizeReserveUsd: 0.25,
        synthesisReserveUsd: 0.8,
        acceptanceReserve: 'require',
        atCap: 'finish-with-partial',
      },
      acceptance,
      parallelAdmission: 'all-or-none',
      requireBatchSpawn: 'reject-spawn-agent',
      onUnsettledAtExit: 'drain',
      exposeChildResultTools: true,
      exposeSettledResultsTool: true,
      executionFacts: true,
      coordinationCheckpoints: true,
      synthesis: {
        mode: 'single',
        context: 'full',
        runFacts: { workflowSoFar: true },
        policyFacts: true,
        estCost: 0.68,
        limits: { maxTurns: 4, maxOutputTokensPerTurn: 22_000 },
        instructions: 'Return one self contained Markdown migration RFC.',
      },
    },
    // The harness's run budget; its `limits: { maxInFlight: 5 }` run
    // option is not a typed option (UsageLimits has no such key) and
    // is left out.
    { runId, budgetUsd: 7 },
  ).result;
  const entries = await store.load(runId);
  return { outcome, entries, kits, captures, synthesis };
}

/**
 * The roster contract: the four settled specialist rows of the journal
 * (kind 'agent', scope 'agent:0'), matched to the fixture by the
 * report's first heading, carry exactly the fixture's status, evidence
 * verdict, executed calls and cap, entry count, and terminal error; the
 * batch admitted the four in one parallel_agents call; and the limit
 * child reached the coordinator with BOTH its terminal output and its
 * structured partial.
 */
function expectRosterAsJournaled(
  entries: readonly JournalEntry[],
  kits: Record<string, { evidence: () => unknown[] }>,
  awaited: string | undefined,
): void {
  const settled = entries.filter(
    (entry): entry is JournalEntry & SettledRow =>
      entry.kind === 'agent' &&
      entry.scope === 'agent:0' &&
      (entry.status === 'ok' || entry.status === 'limit'),
  );
  expect(settled).toHaveLength(ROSTER.length);
  for (const row of ROSTER) {
    const journaled = settled.find(
      (entry) => typeof entry.value === 'string' && entry.value.startsWith(row.heading),
    );
    expect(journaled, row.agentType).toBeDefined();
    expect(journaled?.status).toBe(row.status);
    expect(journaled?.evidence).toEqual(row.evidence);
    expect(journaled?.evidenceEntries).toHaveLength(row.evidence.recordedEntries);
    // The journal's projection of the tool budget is the used count and
    // the cap, exactly the two numbers the fixture's table carries.
    expect(journaled?.toolBudget).toEqual(row.toolBudget);
    expect(journaled?.error).toEqual(
      row.error === undefined
        ? undefined
        : {
            code: row.error.code,
            message: row.error.message,
            retryable: false,
            data: { kind: row.error.kind },
          },
    );
    // Host side, the kit of each role holds exactly the entries its
    // specialist recorded.
    expect(kits[row.agentType]?.evidence()).toHaveLength(row.evidence.recordedEntries);
  }
  const admissions = decisionsOf(entries, 'spawn-admission');
  expect(admissions).toHaveLength(4);
  for (const admission of admissions) {
    expect((admission.value as { origin?: string }).origin).toBe('parallel_agents');
  }
  // The await digest the coordinator finished on carries the limit
  // child's reserve summary as its final output and its last progress
  // report as its partial: both salvage arms have something to salvage.
  expect(awaited).toBeDefined();
  expect(awaited).toContain('final:');
  expect(awaited).toContain('partial:');
  expect(awaited).toContain(LIMIT_MESSAGE);
}

/** The acceptance roster rows in spawn order, held against the fixture. */
function expectAcceptanceRows(rows: readonly AcceptanceRow[] | undefined): string {
  expect(rows).toHaveLength(ROSTER.length);
  expect(rows?.map((row) => ({ status: row.status, evidence: row.evidence }))).toEqual(
    ROSTER.map((row) => ({ status: row.status, evidence: row.evidence })),
  );
  const limitRow = rows?.find((row) => row.status === 'limit');
  expect(limitRow?.error).toEqual({ kind: LIMIT_ROW.error?.kind, message: LIMIT_MESSAGE });
  return limitRow?.child ?? '';
}

describe('the acceptance re judged over the tenth comparison experiment roster (plan 49 C1.1)', () => {
  it('the harness acceptance rejects the roster byte for byte as the journal recorded', async () => {
    const { outcome, entries, kits, captures, synthesis } = await runRoster(
      HARNESS_ACCEPTANCE,
      'REJUDGE-HARNESS',
    );
    expectRosterAsJournaled(entries, kits, captures.awaited);
    // The template reproduces the journal's text for the journal's id.
    expect(rejectionNaming(JOURNAL_LIMIT_CHILD)).toBe(JOURNAL_REJECTION);

    expect(outcome.status).toBe('error');
    const error = outcome.error as unknown as {
      code: string;
      message: string;
      data: {
        source: string;
        completion: string;
        childPolicy: string;
        childStatusCounts: Record<string, number>;
        degradedReasons: string[];
        minSpawnedChildren: number;
        spawnedChildren: number;
        acceptanceChildren: AcceptanceRow[];
        synthesisSkipped: string;
        childLimitProfile: Record<string, number>;
        semanticPasses: Record<string, { ran: boolean; reason?: string }>;
        salvagedTerminalOutputChildren?: string[];
        salvagedPartialChildren?: string[];
      };
    };
    expect(error.code).toBe('fail_run');
    const limitChild = expectAcceptanceRows(error.data.acceptanceChildren);
    expect(limitChild).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/u);
    expect(error.message).toBe(rejectionNaming(limitChild));
    expect(error.data.source).toBe('orchestrator_acceptance');
    expect(error.data.completion).toBe('rejected');
    expect(error.data.childPolicy).toBe('all-ok');
    expect(error.data.childStatusCounts).toEqual({ ok: 3, limit: 1 });
    expect(error.data.degradedReasons).toEqual([
      `child ${limitChild} settled 'limit' (terminal: ${LIMIT_MESSAGE})`,
    ]);
    expect(error.data.minSpawnedChildren).toBe(4);
    expect(error.data.spawnedChildren).toBe(4);
    expect(error.data.salvagedTerminalOutputChildren).toBeUndefined();
    expect(error.data.salvagedPartialChildren).toBeUndefined();
    expect(error.data.synthesisSkipped).toBe('synthesis_skipped_by_acceptance');
    expect(error.data.childLimitProfile).toEqual(LIMIT_PROFILE);
    expect(error.data.semanticPasses).toEqual({
      contradictions: { ran: false, reason: 'not-configured' },
      claimConsistency: { ran: false, reason: 'not-configured' },
      synthesis: { ran: false, reason: 'run-rejected' },
    });
    // The engine lifts the same facts onto the outcome, as the
    // experiment's rulvar-outcome.json shows them.
    expect(outcome.completion).toBe('rejected');
    expect(outcome.childStatusCounts).toEqual({ ok: 3, limit: 1 });
    expect(outcome.synthesisSkipped).toBe('synthesis_skipped_by_acceptance');
    // A rejected run never pays for the configured synthesis.
    expect(synthesis.calls).toHaveLength(0);
    // ONE journaled decision, the verdict the resume would roll forward.
    const decisions = decisionsOf(entries, 'orchestrator_acceptance');
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.value).toMatchObject({
      verdict: 'rejected',
      completion: 'rejected',
      childStatusCounts: { ok: 3, limit: 1 },
      minSpawnedChildren: 4,
      spawnedChildren: 4,
      childLimitProfile: LIMIT_PROFILE,
      synthesisSkipped: 'synthesis_skipped_by_acceptance',
    });
  });

  it("the plan's salvage flags accept the same roster as a named partial, and the synthesis composes it", async () => {
    const { outcome, entries, kits, captures, synthesis } = await runRoster(
      REJUDGE_ACCEPTANCE,
      'REJUDGE-SALVAGE',
    );
    expectRosterAsJournaled(entries, kits, captures.awaited);

    expect(outcome.error).toBeUndefined();
    expect(outcome.status).toBe('ok');
    const envelope = outcome.value as Envelope & { acceptanceChildren?: AcceptanceRow[] };
    // The journaled decision is the authority on the roster.
    const decisions = decisionsOf(entries, 'orchestrator_acceptance');
    expect(decisions).toHaveLength(1);
    const decision = decisions[0]?.value as unknown as {
      verdict: string;
      completion: string;
      children?: AcceptanceRow[];
      salvagedTerminalOutputChildren?: string[];
      salvagedPartialChildren?: string[];
      acceptedByDegrade?: true;
      synthesisSkipped?: string;
    };
    const limitChild = expectAcceptanceRows(decision.children);
    expect(decision.children?.map((row) => row.salvage)).toEqual([
      undefined,
      undefined,
      'terminal-output',
      undefined,
    ]);
    expect(decision.verdict).toBe('accepted');
    expect(decision.completion).toBe('partial');
    // The output arm wins when both arms apply: the reserve summary
    // already passed the child's output validation.
    expect(decision.salvagedTerminalOutputChildren).toEqual([limitChild]);
    expect(decision.salvagedPartialChildren).toBeUndefined();
    expect(decision.acceptedByDegrade).toBeUndefined();
    expect(decision.synthesisSkipped).toBeUndefined();

    expect(envelope.completion).toBe('partial');
    expect(envelope.childStatusCounts).toEqual({ ok: 3, limit: 1 });
    expect(envelope.salvagedTerminalOutputChildren).toEqual([limitChild]);
    expect(envelope.salvagedPartialChildren).toBeUndefined();
    expect(envelope.degradedReasons).toEqual([
      `child ${limitChild} accepted with its validated terminal output (settled 'limit' after ` +
        'the finalization reserve summary)',
    ]);
    expect(envelope.childLimitProfile).toEqual(LIMIT_PROFILE);
    // The accepted value is the SYNTHESIS composed over the four full
    // reports (context 'full'), never the coordinator's draft.
    expect(envelope.result).toBe(RFC);
    expect(envelope.semanticPasses?.synthesis).toEqual({ ran: true });
    expect(synthesis.calls).toHaveLength(1);
    const composed = textOf(synthesis.calls[0]);
    for (const row of ROSTER) {
      expect(composed).toContain(row.heading);
    }
    // The draft is context for the composition, never the value, and
    // the policy facts name the roster's binding profile: four window
    // entries, one reserve summary, no extension.
    expect(composed).toContain(`DRAFT: ${JSON.stringify(DRAFT)}`);
    expect(composed).toContain('CHILD OUTPUTS: [');
    expect(composed).toContain(
      'POLICY FACTS: {"children":4,"byStatus":{"limit":1,"ok":3},"extensionsGranted":0,' +
        '"finalizationWindowsEntered":4,"finalizationReservesUsed":1}',
    );
    expect(outcome.completion).toBe('partial');
  });

  it("the RV4905 preset's acceptance, degraded the way the cookbook spreads it, accepts the roster too", async () => {
    // Only the acceptance is taken from the preset: its limits carry the
    // extension that would convert the overrun into a grant, which
    // changes the specialists' behavior, so the profiles keep the
    // harness's limits and the roster stays the journal's.
    const preset = researchFanOut({
      root: repository(),
      budgetUsd: CHILD_BUDGET_USD,
      children: 4,
      evidenceContract: { minEntries: FLOOR },
    }).acceptance;
    expect(preset).toEqual({
      childPolicy: 'all-ok',
      acceptPartialChildren: true,
      acceptValidatedTerminalOutputOnLimit: true,
      onUnreachable: 'notify',
      requireEvidenceFloor: true,
      minSpawnedChildren: 4,
    });
    const { outcome, entries, kits, captures, synthesis } = await runRoster(
      { ...preset, onUnreachable: 'degrade' },
      'REJUDGE-PRESET',
    );
    expectRosterAsJournaled(entries, kits, captures.awaited);

    expect(outcome.error).toBeUndefined();
    expect(outcome.status).toBe('ok');
    const envelope = outcome.value as Envelope;
    const decisions = decisionsOf(entries, 'orchestrator_acceptance');
    expect(decisions).toHaveLength(1);
    const decision = decisions[0]?.value as unknown as {
      verdict: string;
      completion: string;
      children?: AcceptanceRow[];
      salvagedTerminalOutputChildren?: string[];
      acceptedByDegrade?: true;
    };
    const limitChild = expectAcceptanceRows(decision.children);
    expect(decision.verdict).toBe('accepted');
    expect(decision.completion).toBe('partial');
    expect(decision.salvagedTerminalOutputChildren).toEqual([limitChild]);
    // The salvage arm accepted the child on its merits: the degrade
    // posture never had to, and the forecast never turned, so no
    // forecast decision was journaled.
    expect(decision.acceptedByDegrade).toBeUndefined();
    expect(decisionsOf(entries, 'orchestrator_acceptance_forecast')).toHaveLength(0);
    expect(envelope.completion).toBe('partial');
    expect(envelope.childStatusCounts).toEqual({ ok: 3, limit: 1 });
    expect(envelope.salvagedTerminalOutputChildren).toEqual([limitChild]);
    expect(envelope.result).toBe(RFC);
    expect(envelope.semanticPasses?.synthesis).toEqual({ ran: true });
    expect(synthesis.calls).toHaveLength(1);
  });
});
