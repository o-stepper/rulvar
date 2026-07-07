/**
 * M2 gating cassettes, DEF-6 set (M2-T12; docs/11, section 4; docs/09,
 * section 6.6): the six compatibility IDs over the frozen round-1 JSONL
 * fixture and the synthetic out-of-window fixtures, plus the mandatory
 * mixed-version scenarios (ordinal-space split, forward-cursor
 * preference, cross-version resolution), the compatibility lemma, and the
 * KeyDeriver contract tests against the frozen v2 golden identities.
 */
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { deriverV0Synthetic } from '@lurker/compat';
import {
  buildAbandonFold,
  buildDeriverRegistry,
  createEngine,
  defineWorkflow,
  deriveContentKey,
  deriverV1,
  deriverV2,
  EMPTY_SCHEMA_HASH,
  EMPTY_TOOLSET_HASH,
  hashWorkflowBody,
  InMemoryStore,
  JournalCompatibilityError,
  JsonlFileStore,
  normalizeEntry,
  replayDisposition,
  Replayer,
  type Ctx,
  type IdentityInput,
  type JournalEntry,
} from '@lurker/core';
import { FakeAdapter, FAKE_MODEL_REF } from '../fake-adapter.js';
import {
  APPROVED_SCHEMA,
  fakeAgentIdentity,
  FixtureJournal,
  PROMPTS,
  usageOf,
  WORKED_EXAMPLE_INPUT,
} from './build-fixtures.js';

const V1_FIXTURE_PATH = fileURLToPath(
  new URL('../../fixtures/frozen/v1-journal.jsonl', import.meta.url),
);
const GOLDEN_IDENTITY_PATH = fileURLToPath(
  new URL('../../fixtures/frozen/v2-golden-identity.json', import.meta.url),
);

function cassetteEntries(id: string): JournalEntry[] {
  const url = new URL(`../../../../cassettes/${id}.json`, import.meta.url);
  return (JSON.parse(readFileSync(url, 'utf8')) as { entries: JournalEntry[] }).entries;
}

const RUN = 'RUNV1';
// Frozen v1 journal layout: agent 0/1, step 2/3, rand 4, external 5
// (editor-approval), approval 6 (publish), polish-intro repeats 7/8 and
// 9/10 (the v1 ordinal space 0 and 1).
const EXTERNAL_SEQ = 5;
const APPROVAL_SEQ = 6;
const V1_ENTRY_COUNT = 11;

/**
 * Seeds a fresh JsonlFileStore with the frozen fixture BYTES (the store
 * must keep them byte-identical: normalization never rewrites) and closes
 * the two open v1 suspensions offline the way an operator would: the
 * external resolves; the approval flow (its tool consumer arrives in M3)
 * is abandoned under the resolution's authority.
 */
async function seedV1Store(options?: { resolveOffline?: boolean }) {
  const dir = mkdtempSync(join(tmpdir(), 'lurker-def6-'));
  const store = new JsonlFileStore({ dir });
  const journalPath = join(dir, `${RUN}.jsonl`);
  copyFileSync(V1_FIXTURE_PATH, journalPath);
  await store.putMeta({
    runId: RUN,
    status: 'suspended',
    updatedAt: new Date(0).toISOString(),
    workflowName: 'v1-flow',
  });
  if (options?.resolveOffline !== false) {
    const prior = (await store.load(RUN)).map((entry) => normalizeEntry(entry));
    const offline = new Replayer({ runId: RUN, store, priorEntries: prior });
    const resolved = await offline.resolveSuspended(EXTERNAL_SEQ, {
      by: 'external',
      value: { approved: true },
    });
    expect(resolved.applied).toBe(true);
    const abandoned = await offline.abandonBranch({
      target: APPROVAL_SEQ,
      authorizedBy: resolved.seq,
      reason: 'approval flow superseded by the operator',
    });
    expect(abandoned.applied).toBe(true);
  }
  return { store, dir, journalPath };
}

interface V1FlowResult {
  draft: unknown;
  saved: unknown;
  stampMs: number;
  intro1: unknown;
  intro2: unknown;
  approved: boolean;
}

/** The unchanged v1 workflow body; `insert` splices the DEF-6 variants in. */
function v1Flow(insert?: (ctx: Ctx) => Promise<Record<string, unknown>>) {
  return defineWorkflow({ name: 'v1-flow' }, async (ctx) => {
    const draft = await ctx.agent(PROMPTS.draftSummary);
    const saved = await ctx.step('persist-draft', () => ({
      written: true,
      path: 'drafts/summary.md',
    }));
    const stampMs = ctx.now();
    const inserted = insert === undefined ? {} : await insert(ctx);
    const intro1 = await ctx.agent(PROMPTS.polishIntro);
    const intro2 = await ctx.agent(PROMPTS.polishIntro);
    const approval = await ctx.awaitExternal<{ approved: boolean }>('editor-approval', {
      schema: APPROVED_SCHEMA,
      prompt: 'Approve the draft?',
    });
    return { draft, saved, stampMs, intro1, intro2, approved: approval.approved, ...inserted };
  });
}

function fakeEngine(store: JsonlFileStore | InMemoryStore, responder = 'fresh live output') {
  const adapter = new FakeAdapter({ agents: { '*': responder } });
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: { routing: { loop: FAKE_MODEL_REF } },
  });
  return { engine, adapter };
}

describe('DEF-6 cassettes over the frozen v1 journal (docs/11, section 4)', () => {
  it('resume-v1-on-engine-v2: zero live calls, every entry consumed, the store never rewritten', async () => {
    const fixtureBytes = readFileSync(V1_FIXTURE_PATH, 'utf8');
    const { store, journalPath } = await seedV1Store();
    const { engine, adapter } = fakeEngine(store, 'MUST NOT RUN');
    const handle = engine.resume(RUN, v1Flow(), { dryRun: true });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({
      draft: 'summary text, first draft',
      saved: { written: true, path: 'drafts/summary.md' },
      stampMs: 1_706_745_600_000,
      intro1: 'intro pass one',
      intro2: 'intro pass two',
      approved: true,
    });
    expect(adapter.calls).toHaveLength(0);
    const preview = await handle.preview;
    expect(preview.misses).toBe(0);
    expect(preview.orphaned).toEqual([]);
    // agent + step + rand + two intros + the re-armed external.
    expect(preview.hits).toBe(6);
    // The abandoned approval flow is skipped, never orphaned.
    expect(preview.skipped).toBe(1);
    expect(preview.invalidResolutions).toEqual([]);
    // Normalization never rewrites the store: the frozen v1 lines are
    // byte-identical; only the v2 ref-entries were APPENDED after them.
    const fileAfter = readFileSync(journalPath, 'utf8');
    expect(fileAfter.startsWith(fixtureBytes)).toBe(true);
    const appended = (await store.load(RUN)).filter((entry) => entry.seq >= V1_ENTRY_COUNT);
    expect(appended.every((entry) => entry.hashVersion === 2)).toBe(true);
  });

  it('resume-v1-with-inserted-call: exactly one live call, hashVersion 2, zero overpayment', async () => {
    const { store } = await seedV1Store();
    const { engine, adapter } = fakeEngine(store, 'citations verified');
    const wf = v1Flow(async (ctx) => ({ checked: await ctx.agent(PROMPTS.crossCheck) }));
    const handle = engine.resume(RUN, wf);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect((outcome.value as Record<string, unknown>).checked).toBe('citations verified');
    expect((outcome.value as Record<string, unknown>).intro2).toBe('intro pass two');
    expect(adapter.calls).toHaveLength(1);
    expect(adapter.calls[0]?.prompt).toBe(PROMPTS.crossCheck);
    const preview = await handle.preview;
    expect(preview.misses).toBe(1);
    expect(preview.hits).toBe(6);
    expect(preview.orphaned).toEqual([]);
    // The inserted operation journals under the CURRENT profile with a
    // correct ordinal in its own (hashVersion, key) space.
    const inserted = (await store.load(RUN)).find(
      (entry) =>
        entry.kind === 'agent' &&
        entry.status === 'running' &&
        entry.key === deriveContentKey(fakeAgentIdentity(PROMPTS.crossCheck)),
    );
    expect(inserted?.hashVersion).toBe(2);
    expect(inserted?.ordinal).toBe(0);
  });

  it('suspended-v1-resolves-on-v2: superseding v2 append by seq, schema-validated at consumption', async () => {
    const { store } = await seedV1Store({ resolveOffline: false });
    const prior = (await store.load(RUN)).map((entry) => normalizeEntry(entry));
    const offline = new Replayer({ runId: RUN, store, priorEntries: prior });
    // The schema-invalid offline attempt is journaled, classifies
    // invalid, and leaves the entry suspended (FR-017 acceptance).
    const invalid = await offline.resolveSuspended(EXTERNAL_SEQ, {
      by: 'external',
      value: { approved: 'yes' },
    });
    expect(invalid.applied).toBe(false);
    expect(offline.suspensionState(EXTERNAL_SEQ)).toMatchObject({ state: 'suspended' });
    const valid = await offline.resolveSuspended(EXTERNAL_SEQ, {
      by: 'operator',
      value: { approved: true },
    });
    expect(valid.applied).toBe(true);
    await offline.abandonBranch({
      target: APPROVAL_SEQ,
      authorizedBy: valid.seq,
      reason: 'approval flow superseded by the operator',
    });
    // The superseding appends carry hashVersion 2 and reference by seq.
    const resolutions = (await store.load(RUN)).filter((entry) => entry.kind === 'resolution');
    expect(resolutions).toHaveLength(2);
    expect(resolutions.every((entry) => entry.hashVersion === 2 && entry.ref === EXTERNAL_SEQ)).toBe(
      true,
    );
    const { engine, adapter } = fakeEngine(store, 'MUST NOT RUN');
    const outcome = await engine.resume(RUN, v1Flow(), { dryRun: true }).result;
    expect(outcome.status).toBe('ok');
    expect((outcome.value as V1FlowResult).approved).toBe(true);
    expect(adapter.calls).toHaveLength(0);
  });

  it('effort-defaults-shift: the v1 predicate is effort-insensitive; new entries carry real effort', async () => {
    const { store } = await seedV1Store();
    const { engine, adapter } = fakeEngine(store, 'tone assessed');
    // The same flow re-run under a config that now requests high effort:
    // every v1 entry still matches (effort is stripped by the v1
    // projection); only the genuinely new call goes live.
    const wf = defineWorkflow({ name: 'v1-flow' }, async (ctx) => {
      const draft = await ctx.agent(PROMPTS.draftSummary, { effort: 'high' });
      const saved = await ctx.step('persist-draft', () => ({
        written: true,
        path: 'drafts/summary.md',
      }));
      const stampMs = ctx.now();
      const intro1 = await ctx.agent(PROMPTS.polishIntro, { effort: 'high' });
      const intro2 = await ctx.agent(PROMPTS.polishIntro, { effort: 'high' });
      const tone = await ctx.agent(PROMPTS.assessTone, { effort: 'high' });
      const approval = await ctx.awaitExternal<{ approved: boolean }>('editor-approval', {
        schema: APPROVED_SCHEMA,
        prompt: 'Approve the draft?',
      });
      return { draft, saved, stampMs, intro1, intro2, tone, approved: approval.approved };
    });
    const handle = engine.resume(RUN, wf);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    const value = outcome.value as Record<string, unknown>;
    expect(value.draft).toBe('summary text, first draft');
    expect(value.intro1).toBe('intro pass one');
    expect(value.tone).toBe('tone assessed');
    expect(adapter.calls).toHaveLength(1);
    const preview = await handle.preview;
    expect(preview.hits).toBe(6);
    expect(preview.misses).toBe(1);
    expect(preview.orphaned).toEqual([]);
    // The new entry's identity INCLUDES the canonical effort.
    const tone = (await store.load(RUN)).find(
      (entry) =>
        entry.kind === 'agent' &&
        entry.status === 'running' &&
        entry.key === deriveContentKey(fakeAgentIdentity(PROMPTS.assessTone, 'high')),
    );
    expect(tone?.hashVersion).toBe(2);
    expect(deriveContentKey(fakeAgentIdentity(PROMPTS.assessTone, 'high'))).not.toBe(
      deriveContentKey(fakeAgentIdentity(PROMPTS.assessTone)),
    );
    // Legacy entries fold their effort as medium (pricing and the ladder
    // statistics consume foldDefaults from M4).
    expect(deriverV1.foldDefaults.effort).toBe('medium');
  });

  it('reject-version-too-old: typed refusal with zero side effects; extraDerivers reopens the window', async () => {
    const entries = cassetteEntries('reject-version-too-old');
    const store = new InMemoryStore();
    for (const entry of entries) {
      await store.append('RUNV0', entry);
    }
    const wf = defineWorkflow({ name: 'v0-flow' }, async (ctx) => ctx.agent(PROMPTS.v0Relic));
    await store.putMeta({
      runId: 'RUNV0',
      status: 'suspended',
      updatedAt: new Date(0).toISOString(),
      workflowName: 'v0-flow',
      workflowHash: hashWorkflowBody(wf),
    });
    const { engine, adapter } = fakeEngine(store, 'MUST NOT RUN');
    const rejection = engine.resume('RUNV0', wf).result;
    await expect(rejection).rejects.toThrow(JournalCompatibilityError);
    await expect(rejection).rejects.toMatchObject({
      subCode: 'HASH_VERSION_TOO_OLD',
      hint: 'enable deriverV0 from @lurker/compat via extraDerivers',
    });
    // Zero live calls, zero appends, zero admission reserves.
    expect(adapter.calls).toHaveLength(0);
    expect(await store.load('RUNV0')).toHaveLength(entries.length);
    // The matching deriver from @lurker/compat resumes the run normally.
    const compatAdapter = new FakeAdapter({ agents: { '*': 'MUST NOT RUN' } });
    const compatEngine = createEngine({
      adapters: [compatAdapter],
      stores: { journal: store },
      defaults: { routing: { loop: FAKE_MODEL_REF } },
      extraDerivers: [deriverV0Synthetic],
    });
    const outcome = await compatEngine.resume('RUNV0', wf, { dryRun: true }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('relic out');
    expect(compatAdapter.calls).toHaveLength(0);
  });

  it('reject-version-from-future: HASH_VERSION_TOO_NEW at load, no side effects', async () => {
    const entries = cassetteEntries('reject-version-from-future');
    const store = new InMemoryStore();
    for (const entry of entries) {
      await store.append('RUNV3', entry);
    }
    const wf = defineWorkflow({ name: 'future-flow' }, async (ctx) =>
      ctx.agent(PROMPTS.futureStage),
    );
    await store.putMeta({
      runId: 'RUNV3',
      status: 'suspended',
      updatedAt: new Date(0).toISOString(),
      workflowName: 'future-flow',
    });
    const { engine, adapter } = fakeEngine(store, 'MUST NOT RUN');
    const rejection = engine.resume('RUNV3', wf).result;
    await expect(rejection).rejects.toThrow(JournalCompatibilityError);
    await expect(rejection).rejects.toMatchObject({
      subCode: 'HASH_VERSION_TOO_NEW',
      hint: 'upgrade lurker',
    });
    expect(adapter.calls).toHaveLength(0);
    expect(await store.load('RUNV3')).toHaveLength(entries.length);
    // The scan repeats at lease acquire in queue mode: re-records with
    // @lurker/store-sqlite in M5.
  });
});

describe('mixed-version scenarios (docs/11, section 4 MUSTs)', () => {
  it('ordinal-space split: two v1 repeats, the third call goes live as hashVersion 2 ordinal 0; later resumes match all three', async () => {
    const { store } = await seedV1Store();
    const wfThree = defineWorkflow({ name: 'v1-flow' }, async (ctx) => {
      const draft = await ctx.agent(PROMPTS.draftSummary);
      const saved = await ctx.step('persist-draft', () => ({
        written: true,
        path: 'drafts/summary.md',
      }));
      const stampMs = ctx.now();
      // Three repeats of one call: the first two match the v1 ordinals
      // 0 and 1; the third goes live into the v2 ordinal space.
      const intro1 = await ctx.agent(PROMPTS.polishIntro);
      const intro2 = await ctx.agent(PROMPTS.polishIntro);
      const intro3 = await ctx.agent(PROMPTS.polishIntro);
      const approval = await ctx.awaitExternal<{ approved: boolean }>('editor-approval', {
        schema: APPROVED_SCHEMA,
        prompt: 'Approve the draft?',
      });
      return { draft, saved, stampMs, intro1, intro2, intro3, approved: approval.approved };
    });
    const { engine, adapter } = fakeEngine(store, 'intro pass three');
    const outcome = await engine.resume(RUN, wfThree).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toMatchObject({
      intro1: 'intro pass one',
      intro2: 'intro pass two',
      intro3: 'intro pass three',
    });
    expect(adapter.calls).toHaveLength(1);
    const grown = await store.load(RUN);
    const v2Polish = grown.find(
      (entry) =>
        entry.hashVersion === 2 &&
        entry.kind === 'agent' &&
        entry.status === 'running' &&
        entry.key === deriveContentKey(fakeAgentIdentity(PROMPTS.polishIntro)),
    );
    // Its own (hashVersion, key) ordinal space starts at 0 (DEF-6).
    expect(v2Polish?.ordinal).toBe(0);
    // Never-pay-twice-through-upgrade lemma: the next resume replays all
    // three repeats (two v1, one v2) with zero live calls.
    const { engine: second, adapter: secondAdapter } = fakeEngine(store, 'MUST NOT RUN');
    const replayed = await second.resume(RUN, wfThree, { dryRun: true }).result;
    expect(replayed.status).toBe('ok');
    expect((replayed.value as Record<string, unknown>).intro3).toBe('intro pass three');
    expect(secondAdapter.calls).toHaveLength(0);
  });

  it('forward-cursor: one live call matching both a v1 and a later v2 entry consumes the v1 (journal order)', async () => {
    const j = new FixtureJournal();
    j.agentOp({ prompt: PROMPTS.sharedStage, hashVersion: 1, value: 'v1 wins', usage: usageOf(10, 2) });
    j.agentOp({ prompt: PROMPTS.sharedStage, hashVersion: 2, value: 'v2 later', usage: usageOf(10, 2) });
    const store = new InMemoryStore();
    for (const entry of j.entries) {
      await store.append('MIXED', entry);
    }
    const wf = defineWorkflow({ name: 'mixed' }, async (ctx) => ctx.agent(PROMPTS.sharedStage));
    await store.putMeta({
      runId: 'MIXED',
      status: 'suspended',
      updatedAt: new Date(0).toISOString(),
      workflowName: 'mixed',
      workflowHash: hashWorkflowBody(wf),
    });
    const { engine, adapter } = fakeEngine(store, 'MUST NOT RUN');
    const handle = engine.resume('MIXED', wf);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('v1 wins');
    expect(adapter.calls).toHaveLength(0);
    // The unconsumed v2 twin is reported honestly.
    expect((await handle.preview).orphaned).toEqual([2]);
  });

  it('compatibility lemma: v1 and v2 disposition tables agree on the v1 domain', () => {
    const registry = buildDeriverRegistry();
    const fold = buildAbandonFold([]);
    for (const status of ['ok', 'error', 'limit', 'cancelled'] as const) {
      const make = (hashVersion: number): JournalEntry => ({
        hashVersion,
        seq: 0,
        scope: '',
        key: 'k',
        ordinal: 0,
        kind: 'agent',
        status,
        spanId: 's',
        startedAt: 't',
        // The v1 domain: no escalated, no derived skipped, no
        // memoizeOutcome.
      });
      expect(replayDisposition(make(1), fold, { registry })).toBe(
        replayDisposition(make(2), fold, { registry }),
      );
    }
  });
});

describe('KeyDeriver contract tests against the frozen goldens (docs/11, section 4)', () => {
  interface GoldenIdentity {
    workedExampleKey: string;
    emptySchemaHash: string;
    emptyToolsetHash: string;
    perKind: Array<{ name: string; input: IdentityInput; key: string }>;
    v1: {
      agentEffortInsensitive: { withEffort: string; withoutEffort: string };
      incomparableKinds: string[];
    };
  }
  const golden = JSON.parse(readFileSync(GOLDEN_IDENTITY_PATH, 'utf8')) as GoldenIdentity;

  it('the docs/03 1.5 worked example key holds', () => {
    expect(golden.workedExampleKey).toBe(
      '66ef15922e576a8f6884b28176c8c21fee9b4d3bb98c76592ed6ca1d3c8f1062',
    );
    expect(deriveContentKey(WORKED_EXAMPLE_INPUT)).toBe(golden.workedExampleKey);
  });

  it('every per-kind golden identity derives to its frozen key', () => {
    expect(golden.perKind.length).toBeGreaterThanOrEqual(8);
    for (const example of golden.perKind) {
      expect(deriveContentKey(example.input), example.name).toBe(example.key);
    }
    expect(EMPTY_SCHEMA_HASH).toBe(golden.emptySchemaHash);
    expect(EMPTY_TOOLSET_HASH).toBe(golden.emptyToolsetHash);
  });

  it('the v1 projection strips effort and rejects post-round-1 kinds as incomparable', () => {
    const withEffort = deriverV1.project(fakeAgentIdentity(PROMPTS.draftSummary, 'high'));
    const withoutEffort = deriverV1.project(fakeAgentIdentity(PROMPTS.draftSummary));
    expect(withEffort).not.toBe('incomparable');
    expect(withoutEffort).not.toBe('incomparable');
    const withKey = deriverV1.deriveKey(withEffort as Record<string, unknown>);
    const withoutKey = deriverV1.deriveKey(withoutEffort as Record<string, unknown>);
    expect(withKey).toBe(withoutKey);
    expect(withKey).toBe(golden.v1.agentEffortInsensitive.withEffort);
    expect(withoutKey).toBe(golden.v1.agentEffortInsensitive.withoutEffort);
    for (const kind of golden.v1.incomparableKinds) {
      expect(deriverV1.project({ kind } as unknown as IdentityInput), kind).toBe('incomparable');
    }
  });

  it('the frozen disposition tables and foldDefaults never move', () => {
    expect(deriverV1.dispositionTable).toEqual({
      ok: 'replay',
      limit: 'rerun',
      error: 'rerun',
      cancelled: 'rerun',
      running: 'rerun',
    });
    expect(deriverV2.dispositionTable).toEqual({
      ok: 'replay',
      escalated: 'replay',
      limit: 'memoize-limit',
      error: 'memoize-task-error',
      cancelled: 'rerun',
      running: 'rerun',
    });
    const frozenDefaults = { effort: 'medium', memoizeOutcome: false, budgetAccount: 'root' };
    expect(deriverV1.foldDefaults).toEqual(frozenDefaults);
    expect(deriverV2.foldDefaults).toEqual(frozenDefaults);
  });

  it('deriverV0Synthetic shares the v1 profile under hashVersion 0', () => {
    expect(deriverV0Synthetic.hashVersion).toBe(0);
    expect(deriverV0Synthetic.dispositionTable).toEqual(deriverV1.dispositionTable);
    const input = fakeAgentIdentity(PROMPTS.v0Relic, 'high');
    expect(deriverV0Synthetic.project(input)).toEqual(deriverV1.project(input));
  });
});
