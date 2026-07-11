/**
 * The DEF-1 live cassette set (M3-T11; docs/03 section 6.10, docs/09
 * cassette catalog): escalate-replay, crash-between-report-and-decision,
 * flavor-b-timeout, recorded through the live runtime and replayed
 * strict. The committed cassettes are the compatibility contract; the
 * frozen-drift suite pins them to the recorder byte-for-byte.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  hashWorkflowBody,
  InMemoryStore,
  normalizeEntry,
  type EscalationReport,
  type JournalEntry,
  type Workflow,
} from '@rulvar/core';

import { FakeAdapter, FAKE_MODEL_REF } from '../fake-adapter.js';
import { replayRun } from '../replay-strict.js';
import {
  crashBetweenResumeWorkflow,
  escalateReplayWorkflow,
  flavorBTimeoutWorkflow,
} from './record-live.js';
import type { CassetteFixture } from './build-fixtures.js';

function cassette(id: string): CassetteFixture {
  const url = new URL(`../../../../cassettes/${id}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as CassetteFixture;
}

function reportOf(entries: JournalEntry[]): EscalationReport {
  const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'escalated');
  return terminal?.escalation as unknown as EscalationReport;
}

async function seededEngine(entries: JournalEntry[], wf: Workflow<unknown, unknown>) {
  const store = new InMemoryStore();
  const runId = 'live-run';
  for (const entry of entries) {
    await store.append(runId, entry);
  }
  await store.putMeta({
    runId,
    status: 'suspended',
    updatedAt: new Date(0).toISOString(),
    workflowName: wf.name,
    workflowHash: hashWorkflowBody(wf),
  });
  const adapter = new FakeAdapter({ agents: {} });
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
    onEscalation: () => {
      throw new Error('the hook must stay cold: the decision replays from its entry');
    },
  });
  return { engine, adapter, store, runId };
}

describe('DEF-1 live cassettes (M3-T11)', () => {
  it('escalate-replay: zero live calls, byte-identical report, decision from the entry', async () => {
    const { entries } = cassette('escalate-replay');
    const recordedReport = reportOf(entries);
    expect(recordedReport.kind).toBe('scope_bigger');

    const { outcome, preview } = await replayRun(escalateReplayWorkflow(), undefined, {
      journal: entries,
      onEscalation: () => {
        throw new Error('the hook must stay cold: the decision replays from its entry');
      },
    });
    expect(outcome.status).toBe('ok');
    // The respawn's recorded output replays too: the parent decision and
    // the retry both came from the journal.
    expect(outcome.value).toBe('migration retried per service');
    expect(preview.misses).toBe(0);
    expect(preview.reruns).toBe(0);
    const decisionEntry = entries.find((e) => e.kind === 'decision');
    expect(decisionEntry?.value).toMatchObject({
      decisionType: 'escalation.decision',
      countsAgainstLimit: true,
      decision: { kind: 'retry', amendedPrompt: 'split by service' },
    });
    // Ordering held at recording time: terminal escalated before decision.
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'escalated');
    expect((terminal?.seq ?? 99) < (decisionEntry?.seq ?? -1)).toBe(true);
  });

  it('crash-between-report-and-decision: the first resume pays the decision once, the second replays both', async () => {
    const { entries } = cassette('crash-between-report-and-decision');
    expect(entries.some((e) => e.kind === 'decision')).toBe(false);

    // First resume: the escalated entry replays with zero adapter calls;
    // the owner's decision is paid live exactly once (the hook fires and
    // its decision entry is appended; appends are not adapter calls).
    const store = new InMemoryStore();
    const runId = 'crash-run';
    for (const entry of entries) {
      await store.append(runId, entry);
    }
    const wf = crashBetweenResumeWorkflow();
    await store.putMeta({
      runId,
      status: 'suspended',
      updatedAt: new Date(0).toISOString(),
      workflowName: wf.name,
    });
    let hookCalls = 0;
    const adapter = new FakeAdapter({ agents: {} });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
      onEscalation: () => {
        hookCalls += 1;
        return { kind: 'accept', note: 'salvage and move on' };
      },
    });
    const first = await engine.resume(runId, wf).result;
    expect(first.status).toBe('ok');
    expect(first.value).toBe('decided');
    expect(hookCalls).toBe(1);
    expect(adapter.calls).toHaveLength(0);
    const afterFirst = (await store.load(runId)).map((entry) => normalizeEntry(entry));
    const decisionEntry = afterFirst.find((e) => e.kind === 'decision');
    expect(decisionEntry?.value).toMatchObject({
      decisionType: 'escalation.decision',
      decision: { kind: 'accept', note: 'salvage and move on' },
    });

    // Second resume over the full journal: both entries replay; the hook
    // stays cold and no adapter call happens.
    const { outcome, preview } = await replayRun(wf, undefined, {
      journal: afterFirst,
      onEscalation: () => {
        throw new Error('the hook must stay cold on the second resume');
      },
    });
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('decided');
    expect(preview.misses).toBe(0);
  });

  it('flavor-b-timeout: the closing resolution and the terminal replay; no re-suspension', async () => {
    const { entries } = cassette('flavor-b-timeout');
    const suspended = entries.find((e) => e.kind === 'approval');
    const resolution = entries.find((e) => e.kind === 'resolution');
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'escalated');
    const decisionEntry = entries.find((e) => e.kind === 'decision');
    expect(suspended?.deadlineAt).toBeDefined();
    expect(resolution?.resolution?.by).toBe('timeout');
    expect(resolution?.resolution?.value).toMatchObject({ kind: 'cancel' });
    // Recording-time ordering: suspension < resolution < terminal < decision.
    expect((suspended?.seq ?? 99) < (resolution?.seq ?? -1)).toBe(true);
    expect((resolution?.seq ?? 99) < (terminal?.seq ?? -1)).toBe(true);
    expect((terminal?.seq ?? 99) < (decisionEntry?.seq ?? -1)).toBe(true);

    const wf = flavorBTimeoutWorkflow();
    const { engine, adapter, store, runId } = await seededEngine(entries, wf as never);
    const handle = engine.resume(runId, wf);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('escalated');
    // Zero adapter calls; the defaultDecision applied first-wins at
    // recording time and is never re-applied or re-suspended.
    expect(adapter.calls).toHaveLength(0);
    const after = (await store.load(runId)).map((entry) => normalizeEntry(entry));
    expect(after.filter((e) => e.kind === 'approval')).toHaveLength(1);
    expect(after.filter((e) => e.kind === 'resolution')).toHaveLength(1);
    expect(after.filter((e) => e.kind === 'agent' && e.status === 'escalated')).toHaveLength(1);
    // The replayed report is byte-identical to the recorded one.
    const preview = await handle.preview;
    expect(preview.misses).toBe(0);
  });
});
