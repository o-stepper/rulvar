/**
 * Approval revocation and the bounded grant (RV4008, the fifth
 * comparison experiment's P0.6 half): an allow is a recorded fact
 * history cannot unwrite, so the revocation is its OWN journaled
 * decision that beats the allow at the consumption recheck, and a
 * granted allow may carry an expiry that denies the same way. A
 * still-open approval revokes through the ordinary first-closing-wins
 * arbitration, so races stay deterministic by the journal.
 */
import { describe, expect, it } from 'vitest';

import { Replayer } from '../journal/replayer.js';
import { normalizeEntry } from '../l0/entries.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { tool } from '../tools/tool.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { ExternalRegistry } from './external.js';
import { scriptedAdapter } from './test-harness.js';

function deployTool(executions: string[]) {
  return tool({
    name: 'deploy',
    description: 'deploys the site',
    parameters: { type: 'object' },
    needsApproval: true,
    execute: (input) => {
      executions.push(JSON.stringify(input));
      return Promise.resolve('deployed');
    },
  });
}

function approvalScript() {
  return scriptedAdapter((_req, call) =>
    call === 0
      ? { toolCall: { name: 'deploy', args: { site: 'prod' } } }
      : { text: 'release done' },
  );
}

async function parkRun(executions: string[]): Promise<{
  journal: InMemoryStore;
  transcripts: InMemoryTranscriptStore;
  wf: ReturnType<typeof defineWorkflow<unknown, unknown>>;
  approvalSeq: number;
}> {
  const journal = new InMemoryStore();
  const transcripts = new InMemoryTranscriptStore();
  const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
    ctx.agent('ship it', { tools: [deployTool(executions)] }),
  );
  const engine = createEngine({
    adapters: [approvalScript()],
    stores: { journal, transcripts },
    defaults: { routing: { loop: 'fake:model' } },
  });
  const outcome = await engine.run(wf, undefined, { runId: 'revoke-run' }).result;
  expect(outcome.status).toBe('suspended');
  const prior = (await journal.load('revoke-run')).map((entry) => normalizeEntry(entry));
  const approvalSeq = prior.find((entry) => entry.kind === 'approval')?.seq;
  expect(approvalSeq).toBeDefined();
  return { journal, transcripts, wf, approvalSeq: approvalSeq ?? -1 };
}

async function offlineReplayer(journal: InMemoryStore): Promise<Replayer> {
  const prior = (await journal.load('revoke-run')).map((entry) => normalizeEntry(entry));
  return new Replayer({ runId: 'revoke-run', store: journal, priorEntries: prior });
}

describe('approval revocation (RV4008)', () => {
  it('revoking a pending approval denies it through the ordinary arbitration', async () => {
    const executions: string[] = [];
    const adapter = approvalScript();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const handle = engine.run(wf, undefined);
    const revocations: string[] = [];
    handle.on('approval:pending', (event) => {
      const entryRef = (event as unknown as { entryRef: number }).entryRef;
      void handle
        .revokeApproval(ExternalRegistry.approvalKey(entryRef), {
          principal: 'sec-ops',
          reason: 'the deploy window closed',
        })
        .then((outcome) => {
          revocations.push(outcome.state);
        });
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(executions).toEqual([]);
    expect(revocations).toEqual(['denied-pending']);
    const toolResult = adapter.calls[1]?.messages
      .filter((msg) => msg.role === 'tool')
      .flatMap((msg) => msg.parts)
      .find((part) => part.type === 'tool-result') as
      { result: { error: string }; isError?: boolean } | undefined;
    expect(toolResult?.isError).toBe(true);
    expect(toolResult?.result.error).toContain('revoked by sec-ops: the deploy window closed');
  });

  it('a journaled revocation beats a recorded allow at the consumption recheck on resume', async () => {
    const executions: string[] = [];
    const { journal, transcripts, wf, approvalSeq } = await parkRun(executions);
    // Offline: an operator resolves ALLOW; the process that would have
    // consumed it never runs (the crash window). A second operator
    // revokes the standing grant.
    const offline = await offlineReplayer(journal);
    const resolution = await offline.resolveSuspended(approvalSeq, {
      by: 'external',
      value: { decision: 'allow' },
    });
    expect(resolution.applied).toBe(true);
    await offline.appendSinglePhase({
      scope: '',
      key: `approval-revoked:${String(approvalSeq)}`,
      kind: 'decision',
      status: 'ok',
      spanId: 'offline-operator',
      site: 'approval-revocation',
      value: {
        decisionType: 'approval_revoked',
        targetRef: approvalSeq,
        principal: 'sec-ops',
        reason: 'credentials rotated after the grant',
      },
    });
    // Process B: the resume re-matches the recorded allow, the
    // consumption recheck reads the revocation, and the tool never
    // dispatches.
    const adapterB = scriptedAdapter(() => ({ text: 'release aborted' }));
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcomeB = await engineB.resume('revoke-run', wf).result;
    expect(outcomeB.status).toBe('ok');
    expect(executions).toEqual([]);
    const toolResult = adapterB.calls[0]?.messages
      .filter((msg) => msg.role === 'tool')
      .flatMap((msg) => msg.parts)
      .find((part) => part.type === 'tool-result') as
      { result: { error: string }; isError?: boolean } | undefined;
    expect(toolResult?.isError).toBe(true);
    expect(toolResult?.result.error).toContain(
      'revoked by sec-ops: credentials rotated after the grant',
    );
  });

  it('an expired grant denies exactly like a revocation; an unexpired one executes', async () => {
    const expiredExecutions: string[] = [];
    const expired = await parkRun(expiredExecutions);
    const offlineExpired = await offlineReplayer(expired.journal);
    await offlineExpired.resolveSuspended(expired.approvalSeq, {
      by: 'external',
      value: { decision: 'allow', expiresAt: '2000-01-01T00:00:00.000Z' },
    });
    const engineExpired = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'aborted' }))],
      stores: { journal: expired.journal, transcripts: expired.transcripts },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcomeExpired = await engineExpired.resume('revoke-run', expired.wf).result;
    expect(outcomeExpired.status).toBe('ok');
    expect(expiredExecutions).toEqual([]);

    const liveExecutions: string[] = [];
    const granted = await parkRun(liveExecutions);
    const offlineGranted = await offlineReplayer(granted.journal);
    await offlineGranted.resolveSuspended(granted.approvalSeq, {
      by: 'external',
      value: { decision: 'allow', expiresAt: '2100-01-01T00:00:00.000Z' },
    });
    const engineGranted = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'released' }))],
      stores: { journal: granted.journal, transcripts: granted.transcripts },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcomeGranted = await engineGranted.resume('revoke-run', granted.wf).result;
    expect(outcomeGranted.status).toBe('ok');
    expect(liveExecutions).toEqual(['{"site":"prod"}']);
  });

  it('a malformed expiresAt refuses at the registry and fails closed past it', async () => {
    // The registry surface validates the arm.
    const executions: string[] = [];
    const adapter = approvalScript();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const handle = engine.run(wf, undefined);
    const refusals: string[] = [];
    handle.on('approval:pending', (event) => {
      const entryRef = (event as unknown as { entryRef: number }).entryRef;
      const key = ExternalRegistry.approvalKey(entryRef);
      void handle
        .resolveExternal(key, { decision: 'allow', expiresAt: 'next tuesday' })
        .catch((thrown: unknown) => {
          refusals.push(thrown instanceof Error ? thrown.message : String(thrown));
        })
        .then(() => handle.resolveExternal(key, { decision: 'deny', reason: 'cleanup' }))
        .catch(() => undefined);
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(refusals.join(' ')).toContain('expiresAt must be an ISO 8601 date string');
    expect(executions).toEqual([]);

    // Past the registry (a raw store append), the consumption recheck
    // fails CLOSED: an unparsable expiry denies instead of standing
    // forever.
    const rawExecutions: string[] = [];
    const parked = await parkRun(rawExecutions);
    const offline = await offlineReplayer(parked.journal);
    await offline.resolveSuspended(parked.approvalSeq, {
      by: 'external',
      value: { decision: 'allow', expiresAt: 'next tuesday' },
    });
    const engineB = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'aborted' }))],
      stores: { journal: parked.journal, transcripts: parked.transcripts },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcomeB = await engineB.resume('revoke-run', parked.wf).result;
    expect(outcomeB.status).toBe('ok');
    expect(rawExecutions).toEqual([]);
  });

  it('revoking a denied approval reports already-closed and appends nothing', async () => {
    const executions: string[] = [];
    const adapter = approvalScript();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const handle = engine.run(wf, undefined);
    const outcomes: string[] = [];
    handle.on('approval:pending', (event) => {
      const entryRef = (event as unknown as { entryRef: number }).entryRef;
      const key = ExternalRegistry.approvalKey(entryRef);
      void handle
        .resolveExternal(key, { decision: 'deny', reason: 'no' })
        .then(() => handle.revokeApproval(key, { principal: 'ops', reason: 'moot' }))
        .then((revocation) => {
          outcomes.push(revocation.state);
        });
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcomes).toEqual(['already-closed']);
  });
});
