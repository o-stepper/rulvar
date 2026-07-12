/**
 * M2 cassette and frozen-fixture builders (M2-T12). Fixtures are
 * hand-authored journals with REAL content keys (derived through the
 * frozen KeyDeriver profiles), deterministic timestamps, and fixed span
 * ids, so regeneration is byte-stable.
 *
 * The COMMITTED files under repo cassettes/ and
 * packages/testing/fixtures/frozen/ are the contract; these builders
 * exist to regenerate them DELIBERATELY (scripts/record-m2-cassettes.mjs)
 * and to fail loudly in CI when key derivation drifts (regenerating
 * fixtures to make a test pass is forbidden by policy; any diff requires
 * an explicit hashVersion-bump changeset).
 */
import {
  agentScope,
  buildDeriverRegistry,
  canonicalizeSchema,
  deriveContentKey,
  EMPTY_SCHEMA_HASH,
  EMPTY_TOOLSET_HASH,
  projectToJsonSchema,
  registryKeyRing,
  type AbandonPayload,
  type AgentIdentityInput,
  type Effort,
  type IdentityInput,
  type JournalEntry,
  type JsonSchema,
  type ResolutionPayload,
  type SchemaSpec,
  type Usage,
  type WireError,
} from '@rulvar/core';
import { FAKE_MODEL_REF } from '../fake-adapter.js';

const BASE_MS = Date.parse('2026-02-01T00:00:00.000Z');
const SPAN = 'fixture-span';

function stampOf(seq: number): string {
  return new Date(BASE_MS + seq * 1000).toISOString();
}

export function usageOf(inputTokens: number, outputTokens: number): Usage {
  return { inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

/** The identity ctx.agent computes for a plain prompt against the fake model. */
export function fakeAgentIdentity(prompt: string, effort?: Effort): AgentIdentityInput {
  return {
    kind: 'agent',
    agentType: '',
    modelSpec:
      effort === undefined
        ? { kind: 'model', model: FAKE_MODEL_REF }
        : { kind: 'model', model: FAKE_MODEL_REF, effort },
    prompt,
    schemaHash: EMPTY_SCHEMA_HASH,
    toolsetHash: EMPTY_TOOLSET_HASH,
    isolation: 'none',
  };
}

const RING = registryKeyRing(buildDeriverRegistry());

/**
 * Derives the content key an entry of `hashVersion` carries for this
 * identity. The synthetic hashVersion 0 profile of @rulvar/compat shares
 * the v1 projection by construction (deriverV0Synthetic =
 * { ...deriverV1, hashVersion: 0 }), so v0 fixture keys derive through
 * the v1 profile; synthetic FUTURE versions borrow the v2 derivation (the
 * compatibility scan rejects them before any key is ever compared).
 */
export function keyFor(identity: IdentityInput, hashVersion: number): string {
  const effective = hashVersion === 0 ? 1 : hashVersion > 2 ? 2 : hashVersion;
  const derived = RING.keyFor(identity, effective);
  if (derived === 'incomparable') {
    throw new Error(`fixture identity is incomparable under hashVersion ${String(hashVersion)}`);
  }
  return derived.key;
}

interface AgentOpInput {
  prompt: string;
  scope?: string;
  status?: 'ok' | 'error' | 'limit' | 'cancelled' | 'escalated';
  value?: unknown;
  error?: WireError;
  usage?: Usage;
  memoizeOutcome?: boolean;
  effort?: Effort;
  hashVersion?: number;
}

/** Deterministic journal author: seq, stamps, and ordinals are derived. */
export class FixtureJournal {
  readonly entries: JournalEntry[] = [];
  private seq = 0;
  private readonly ordinals = new Map<string, number>();

  private mint(partial: Omit<JournalEntry, 'seq' | 'ordinal' | 'spanId' | 'startedAt'>): JournalEntry {
    const seq = this.seq;
    this.seq += 1;
    const ordinalKey = `${partial.scope} ${partial.hashVersion} ${partial.key}`;
    const ordinal =
      partial.ref === undefined && partial.kind !== 'resolution' && partial.kind !== 'abandon'
        ? (this.ordinals.get(ordinalKey) ?? 0)
        : 0;
    if (partial.ref === undefined && partial.kind !== 'resolution' && partial.kind !== 'abandon') {
      this.ordinals.set(ordinalKey, ordinal + 1);
    }
    const entry: JournalEntry = {
      ...partial,
      seq,
      ordinal,
      spanId: SPAN,
      startedAt: stampOf(seq),
    };
    this.entries.push(entry);
    return entry;
  }

  /** Two-phase agent operation: running plus terminal. Returns the running entry. */
  agentOp(input: AgentOpInput): JournalEntry {
    const hashVersion = input.hashVersion ?? 2;
    const identity = fakeAgentIdentity(input.prompt, input.effort);
    const running = this.mint({
      hashVersion,
      scope: input.scope ?? '',
      key: keyFor(identity, hashVersion),
      kind: 'agent',
      status: 'running',
      ...(input.memoizeOutcome === undefined ? {} : { memoizeOutcome: input.memoizeOutcome }),
    });
    const terminal = this.mint({
      hashVersion,
      ref: running.seq,
      scope: running.scope,
      key: running.key,
      kind: 'agent',
      status: input.status ?? 'ok',
      ...(input.value === undefined ? {} : { value: input.value as JournalEntry['value'] }),
      ...(input.error === undefined ? {} : { error: input.error }),
      ...(input.usage === undefined ? {} : { usage: input.usage }),
      servedBy: FAKE_MODEL_REF,
      endedAt: stampOf(this.seq),
    });
    // Terminal ordinal mirrors the running entry (one logical operation).
    terminal.ordinal = running.ordinal;
    return running;
  }

  /** A hanging two-phase dispatch (crash before the terminal). */
  danglingAgent(input: { prompt: string; scope?: string; hashVersion?: number }): JournalEntry {
    const hashVersion = input.hashVersion ?? 2;
    const identity = fakeAgentIdentity(input.prompt);
    return this.mint({
      hashVersion,
      scope: input.scope ?? '',
      key: keyFor(identity, hashVersion),
      kind: 'agent',
      status: 'running',
    });
  }

  stepOp(input: { label: string; value: unknown; hashVersion?: number }): JournalEntry {
    const hashVersion = input.hashVersion ?? 2;
    const identity: IdentityInput = { kind: 'step', key: input.label, deps: [] };
    const running = this.mint({
      hashVersion,
      scope: '',
      key: keyFor(identity, hashVersion),
      kind: 'step',
      status: 'running',
    });
    const terminal = this.mint({
      hashVersion,
      ref: running.seq,
      scope: '',
      key: running.key,
      kind: 'step',
      status: 'ok',
      value: input.value as JournalEntry['value'],
      endedAt: stampOf(this.seq),
    });
    terminal.ordinal = running.ordinal;
    return running;
  }

  randNow(value: number, hashVersion = 2): JournalEntry {
    const identity = { kind: 'rand', subtype: 'now' } as const;
    return this.mint({
      hashVersion,
      scope: '',
      key: keyFor(identity, hashVersion),
      kind: 'rand',
      status: 'ok',
      value: { subtype: 'now', value },
      endedAt: stampOf(this.seq),
    });
  }

  external(input: {
    key: string;
    scope?: string;
    schema?: SchemaSpec;
    prompt?: string;
    hashVersion?: number;
  }): JournalEntry {
    const hashVersion = input.hashVersion ?? 2;
    const identity = { kind: 'external', key: input.key } as const;
    const payload: Record<string, unknown> = { key: input.key };
    if (input.prompt !== undefined) {
      payload.prompt = input.prompt;
    }
    if (input.schema !== undefined) {
      payload.schema = canonicalizeSchema(projectToJsonSchema(input.schema));
    }
    return this.mint({
      hashVersion,
      scope: input.scope ?? '',
      key: keyFor(identity, hashVersion),
      kind: 'external',
      status: 'suspended',
      value: payload as JournalEntry['value'],
    });
  }

  approvalSuspended(input: { toolName: string; toolInput: unknown; hashVersion?: number }): JournalEntry {
    const hashVersion = input.hashVersion ?? 2;
    const identity = {
      kind: 'approval',
      toolName: input.toolName,
      input: input.toolInput,
    } as IdentityInput;
    return this.mint({
      hashVersion,
      scope: '',
      key: keyFor(identity, hashVersion),
      kind: 'approval',
      status: 'suspended',
      value: { toolName: input.toolName, input: input.toolInput } as JournalEntry['value'],
    });
  }

  resolution(input: {
    target: number;
    by: ResolutionPayload['by'];
    value: unknown;
    decisionRef?: number;
  }): JournalEntry {
    const target = this.entries.find((entry) => entry.seq === input.target);
    return this.mint({
      hashVersion: 2,
      ref: input.target,
      scope: target?.scope ?? '',
      key: '',
      kind: 'resolution',
      status: 'ok',
      resolution: {
        target: input.target,
        by: input.by,
        value: input.value as ResolutionPayload['value'],
        ...(input.decisionRef === undefined ? {} : { decisionRef: input.decisionRef }),
      },
    });
  }

  abandon(input: { target: number; authorizedBy: number; reason: string }): JournalEntry {
    const target = this.entries.find((entry) => entry.seq === input.target);
    const payload: AbandonPayload = {
      target: input.target,
      authorizedBy: input.authorizedBy,
      reason: input.reason,
      retainCheckpoint: true,
      retainWorktree: false,
    };
    return this.mint({
      hashVersion: 2,
      ref: input.target,
      scope: target?.scope ?? '',
      key: '',
      kind: 'abandon',
      status: 'ok',
      abandon: payload,
    });
  }

  decision(input: { decisionType: string; payload: Record<string, unknown> }): JournalEntry {
    return this.mint({
      hashVersion: 2,
      scope: '',
      key: deriveContentKey({ kind: 'step', key: `decision:${input.decisionType}`, deps: [] }),
      kind: 'decision',
      status: 'ok',
      value: { decisionType: input.decisionType, ...input.payload },
      endedAt: stampOf(this.seq),
    });
  }
}

/** Shared schemas (canonical projections are pinned inside the fixtures). */
export const APPROVED_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['approved'],
  properties: { approved: { type: 'boolean' } },
};

export const DECISION_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['decision'],
  properties: { decision: { type: 'string' } },
};

export const GO_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['go'],
  properties: { go: { type: 'boolean' } },
};

/** Wire projection of an AgentError, as ctx journals it. */
export function agentWireError(
  kind: string,
  message: string,
  retryable: boolean,
  extra?: Record<string, unknown>,
): WireError {
  return { code: 'agent', message, retryable, data: { kind, ...extra } };
}

/** Prompts shared between fixture entries and cassette workflow bodies. */
export const PROMPTS = {
  branchWork: 'branch work',
  childOk: 'child ok',
  childEscalated: 'child escalated',
  childHanging: 'child hanging',
  classify: 'classify the document',
  summarize: 'summarize the document',
  alpha: 'alpha stage',
  beta: 'beta stage',
  gamma: 'gamma stage',
  analyze: 'analyze the incident',
  reviseReport: 'revise the report',
  childResearch: 'child research',
  childDraft: 'child draft',
  revisionEffects: 'apply the revision effects',
  branchAlpha: 'branch alpha',
  subtreeAlpha: 'subtree alpha',
  innerAlpha: 'inner alpha work',
  v0Relic: 'v0 relic stage',
  futureStage: 'future stage',
  draftSummary: 'draft the summary',
  polishIntro: 'polish the intro',
  sharedStage: 'shared stage',
  crossCheck: 'cross-check the citations',
  assessTone: 'assess the tone',
} as const;

/** One cassette fixture file: id, provenance note, and the journal. */
export interface CassetteFixture {
  id: string;
  note: string;
  entries: JournalEntry[];
}

export function buildM2CassetteFixtures(): CassetteFixture[] {
  const fixtures: CassetteFixture[] = [];

  // DEF-1: abandon-subtree and memoize-classifier moved to the live
  // recorder in M3-T11 (record-live.ts); they re-record again with the
  // orchestrator producers in M7.

  // DEF-1: v1-journal-on-v2: round-1 dispositions.
  {
    const j = new FixtureJournal();
    j.agentOp({ prompt: PROMPTS.alpha, hashVersion: 1, value: 'alpha out', usage: usageOf(100, 10) });
    j.agentOp({
      prompt: PROMPTS.beta,
      hashVersion: 1,
      status: 'error',
      error: { code: 'agent', message: 'upstream disconnected', retryable: true, data: { kind: 'transport' } },
      usage: usageOf(10, 0),
    });
    j.agentOp({ prompt: PROMPTS.gamma, hashVersion: 1, status: 'cancelled', usage: usageOf(5, 0) });
    fixtures.push({
      id: 'v1-journal-on-v2',
      note: 'DEF-1: a journal without the new statuses and kinds resumes on the v2 engine; ok replays, error and cancelled rerun, byte-identical to the round-1 table.',
      entries: j.entries,
    });
  }

  // DEF-4: timeout-vs-live-race. The Flavor B
  // deadlineAt dressing arrives with the live producer re-record in M4;
  // the race semantics gate here.
  {
    const j = new FixtureJournal();
    j.agentOp({ prompt: PROMPTS.analyze, value: 'analysis: rollback recommended', usage: usageOf(120, 30) });
    const gate = j.external({
      key: 'escalation-report',
      schema: DECISION_SCHEMA,
      prompt: 'Escalation decision required',
    });
    j.resolution({ target: gate.seq, by: 'external', value: { decision: 'rollback' } });
    j.resolution({ target: gate.seq, by: 'timeout', value: { decision: 'proceed-default' } });
    fixtures.push({
      id: 'timeout-vs-live-race',
      note: 'DEF-4: the live decision wins in journal order; the timeout attempt lands as a journaled noop whose effects are never re-issued.',
      entries: j.entries,
    });
  }

  // DEF-4: class-decision-fanout.
  {
    const j = new FixtureJournal();
    const r1 = j.external({ key: 'report-1' });
    const r2 = j.external({ key: 'report-2' });
    const r3 = j.external({ key: 'report-3' });
    j.resolution({ target: r2.seq, by: 'operator', value: { action: 'retry' } });
    const dec = j.decision({
      decisionType: 'escalation-class',
      payload: { action: 'retry', appliesTo: [r1.seq, r2.seq, r3.seq] },
    });
    j.resolution({ target: r1.seq, by: 'class_decision', decisionRef: dec.seq, value: { action: 'retry' } });
    j.resolution({ target: r2.seq, by: 'class_decision', decisionRef: dec.seq, value: { action: 'retry' } });
    j.resolution({ target: r3.seq, by: 'class_decision', decisionRef: dec.seq, value: { action: 'retry' } });
    fixtures.push({
      id: 'class-decision-fanout',
      note: 'DEF-4: a class-level decision closes three suspended reports, one already closed individually: two applied, one noop with decisionRef preserved. The decision fact itself gains a live consumer in M4.',
      entries: j.entries,
    });
  }

  // DEF-4: abandon-then-crash-then-resume. The
  // plan.revision producer arrives in M7; the abandon carries the reason.
  {
    const j = new FixtureJournal();
    const spawn = j.danglingAgent({ prompt: PROMPTS.reviseReport });
    const subtree = agentScope('', spawn.seq);
    j.agentOp({ prompt: PROMPTS.childResearch, scope: subtree, value: 'notes', usage: usageOf(80, 15) });
    j.agentOp({ prompt: PROMPTS.childDraft, scope: subtree, value: 'draft', usage: usageOf(90, 25) });
    j.abandon({ target: spawn.seq, authorizedBy: spawn.seq, reason: 'plan revision: cancel_task' });
    fixtures.push({
      id: 'abandon-then-crash-then-resume',
      note: 'DEF-4: crash strictly after the abandon and before any effects; resume derives skipped for the whole subtree (skipped, never orphaned) and re-issues only the revision effects.',
      entries: j.entries,
    });
  }

  // DEF-4: abandon-vs-resolution-race, both directions.
  {
    const j = new FixtureJournal();
    const spawnA = j.danglingAgent({ prompt: PROMPTS.branchAlpha });
    const suspA = j.external({ key: 'alpha-gate', scope: agentScope('', spawnA.seq) });
    j.abandon({ target: spawnA.seq, authorizedBy: spawnA.seq, reason: 'cancelled' });
    j.resolution({ target: suspA.seq, by: 'external', value: { go: true } });
    const suspB = j.external({ key: 'beta-gate', schema: GO_SCHEMA });
    j.resolution({ target: suspB.seq, by: 'external', value: { go: true } });
    j.abandon({ target: suspB.seq, authorizedBy: spawnA.seq, reason: 'late cancel' });
    fixtures.push({
      id: 'abandon-vs-resolution-race',
      note: 'DEF-4: a resolution after a covering abandon is a noop (target_abandoned); the reverse order yields an applied resolution and a noop abandon (already_resolved).',
      entries: j.entries,
    });
  }

  // DEF-4: offline-invalid-then-valid.
  {
    const j = new FixtureJournal();
    const gate = j.external({
      key: 'deploy-approval',
      schema: APPROVED_SCHEMA,
      prompt: 'Approve the deployment?',
    });
    j.resolution({ target: gate.seq, by: 'external', value: { approved: 'yes' } });
    j.resolution({ target: gate.seq, by: 'operator', value: { approved: true } });
    fixtures.push({
      id: 'offline-invalid-then-valid',
      note: 'DEF-4: the schema-invalid offline resolution classifies invalid and never closes; the valid one applies; resume consumes the valid value deterministically.',
      entries: j.entries,
    });
  }

  // DEF-4: double-abandon-idempotent.
  {
    const j = new FixtureJournal();
    const spawn = j.agentOp({ prompt: PROMPTS.subtreeAlpha, value: 'alpha done', usage: usageOf(150, 30) });
    const inner = j.agentOp({
      prompt: PROMPTS.innerAlpha,
      scope: agentScope('', spawn.seq),
      value: 'inner out',
      usage: usageOf(70, 10),
    });
    j.abandon({ target: spawn.seq, authorizedBy: spawn.seq, reason: 'first revision' });
    j.abandon({ target: inner.seq, authorizedBy: spawn.seq, reason: 'second revision overlaps' });
    fixtures.push({
      id: 'double-abandon-idempotent',
      note: 'DEF-4: the second abandon over an already-covered target folds to noop; abandon beats the terminal ok status; live and replayed states identical, no repayment.',
      entries: j.entries,
    });
  }

  // DEF-6: reject-version-too-old.
  {
    const j = new FixtureJournal();
    j.agentOp({ prompt: PROMPTS.v0Relic, hashVersion: 0, value: 'relic out', usage: usageOf(40, 5) });
    fixtures.push({
      id: 'reject-version-too-old',
      note: 'DEF-6: hashVersion 0 sits outside the [1,2] window: JournalCompatibilityError HASH_VERSION_TOO_OLD with zero side effects; deriverV0Synthetic from @rulvar/compat reopens the window via extraDerivers.',
      entries: j.entries,
    });
  }

  // DEF-6: reject-version-from-future.
  {
    const j = new FixtureJournal();
    j.agentOp({ prompt: PROMPTS.futureStage, hashVersion: 3, value: 'future out', usage: usageOf(40, 5) });
    fixtures.push({
      id: 'reject-version-from-future',
      note: 'DEF-6: a hashVersion 3 entry on the v2 engine: HASH_VERSION_TOO_NEW at load with zero side effects; the lease-acquire repetition of the scan re-records with queue mode in M5.',
      entries: j.entries,
    });
  }

  return fixtures;
}

/**
 * The frozen v1 journal: a
 * round-1 JSONL file with kinds agent, step, rand, external, approval and
 * the legacy `v: 1` field (no hashVersion member). Returned as raw
 * JSON-ready objects, one per line.
 */
export function buildFrozenV1JournalRaw(): Array<Record<string, unknown>> {
  const j = new FixtureJournal();
  j.agentOp({
    prompt: PROMPTS.draftSummary,
    hashVersion: 1,
    value: 'summary text, first draft',
    usage: usageOf(220, 80),
  });
  j.stepOp({ label: 'persist-draft', value: { written: true, path: 'drafts/summary.md' }, hashVersion: 1 });
  j.randNow(1_706_745_600_000, 1);
  j.external({
    key: 'editor-approval',
    schema: APPROVED_SCHEMA,
    prompt: 'Approve the draft?',
    hashVersion: 1,
  });
  j.approvalSuspended({ toolName: 'publish', toolInput: { channel: 'blog' }, hashVersion: 1 });
  // Two repeats of one call: the v1 ordinal space 0 and 1 (DEF-6 ordinal
  // split scenario; a third call goes live and writes hashVersion 2
  // ordinal 0 in its own space).
  j.agentOp({ prompt: PROMPTS.polishIntro, hashVersion: 1, value: 'intro pass one', usage: usageOf(60, 12) });
  j.agentOp({ prompt: PROMPTS.polishIntro, hashVersion: 1, value: 'intro pass two', usage: usageOf(61, 13) });

  return j.entries.map((entry) => {
    const { hashVersion: _hashVersion, ...rest } = entry;
    // Legacy wire shape: `v` first, no hashVersion.
    return { v: 1, ...rest };
  });
}

/** The agent identity worked example, frozen as executable data. */
export const WORKED_EXAMPLE_INPUT: AgentIdentityInput = {
  kind: 'agent',
  agentType: 'reviewer',
  modelSpec: { kind: 'model', model: 'anthropic:claude-sonnet-4', effort: 'high' },
  prompt: 'Review the attached diff for correctness.',
  schemaHash: 'f1342f68c9dbb49e8056d0414479659414776dfa4c599b3bebd166c8fdc416ba',
  toolsetHash: 'd2c59d7e8cb64de34366877e8764eab84d615942f14167d8715a15d8dbff105c',
  isolation: 'none',
};

/**
 * v2 golden identity fixtures: worked examples per spawn kind (M2-T12).
 * The keys freeze the hashVersion 2 profile; the v1 members freeze the
 * effort-insensitive projection and the incomparable domain.
 */
export function buildV2GoldenIdentity(): Record<string, unknown> {
  const perKind: Array<{ name: string; input: IdentityInput }> = [
    { name: 'agent (docs/03 1.5 worked example)', input: WORKED_EXAMPLE_INPUT },
    { name: 'agent (fake model, no effort)', input: fakeAgentIdentity(PROMPTS.draftSummary) },
    { name: 'child', input: { kind: 'child', workflow: 'sub-flow', args: { topic: 'rulvar' } } },
    { name: 'step', input: { kind: 'step', key: 'persist-draft', deps: [] } },
    { name: 'step (deps)', input: { kind: 'step', key: 'fetch', deps: [{ page: 2 }] } },
    { name: 'external', input: { kind: 'external', key: 'editor-approval' } },
    {
      name: 'approval',
      input: { kind: 'approval', toolName: 'publish', input: { channel: 'blog' } },
    },
    { name: 'rand now', input: { kind: 'rand', subtype: 'now' } },
    { name: 'rand keyed', input: { kind: 'rand', subtype: 'random', key: 'jitter' } },
  ];
  return {
    note: 'FROZEN v2 identity contract (DEF-6). Any diff requires a hashVersion-bump changeset.',
    workedExampleKey: '66ef15922e576a8f6884b28176c8c21fee9b4d3bb98c76592ed6ca1d3c8f1062',
    emptySchemaHash: EMPTY_SCHEMA_HASH,
    emptyToolsetHash: EMPTY_TOOLSET_HASH,
    perKind: perKind.map((example) => ({
      name: example.name,
      input: example.input,
      key: deriveContentKey(example.input),
    })),
    v1: {
      agentEffortInsensitive: {
        withEffort: keyFor(fakeAgentIdentity(PROMPTS.draftSummary, 'high'), 1),
        withoutEffort: keyFor(fakeAgentIdentity(PROMPTS.draftSummary), 1),
      },
      incomparableKinds: [
        'decision',
        'plan.revision',
        'plan.decision',
        'ledger.op',
        'node.link',
        'termination.init',
        'termination.denied',
      ],
    },
  };
}
