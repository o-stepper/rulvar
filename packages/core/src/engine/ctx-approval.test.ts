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

describe('ask suspensions through the engine (M3-T03)', () => {
  it('a live allow resolution continues the same turn and executes the tool once', async () => {
    const executions: string[] = [];
    const engine = createEngine({
      adapters: [approvalScript()],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const handle = engine.run(wf, undefined);
    const offPending = handle.on('approval:pending', (event) => {
      const entryRef = (event as unknown as { entryRef: number }).entryRef;
      void handle.resolveExternal(ExternalRegistry.approvalKey(entryRef), {
        decision: 'allow',
      });
    });
    const outcome = await handle.result;
    offPending();
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('release done');
    expect(executions).toEqual(['{"site":"prod"}']);
  });

  it('a deny resolution surfaces to the model as an error tool result; the tool never runs', async () => {
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
    handle.on('approval:pending', (event) => {
      const entryRef = (event as unknown as { entryRef: number }).entryRef;
      void handle.resolveExternal(ExternalRegistry.approvalKey(entryRef), {
        decision: 'deny',
        reason: 'not during the freeze',
      });
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(executions).toEqual([]);
    const secondRequest = adapter.calls[1];
    const toolResult = secondRequest?.messages
      .filter((msg) => msg.role === 'tool')
      .flatMap((msg) => msg.parts)
      .find((part) => part.type === 'tool-result') as
      { result: { error: string }; isError?: boolean } | undefined;
    expect(toolResult?.isError).toBe(true);
    expect(toolResult?.result.error).toContain('not during the freeze');
  });

  it('an approval round-trip across process exit resumes the same turn', async () => {
    const executions: string[] = [];
    const journal = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );

    // Process A: the ask verdict suspends the run.
    const adapterA = approvalScript();
    const engineA = createEngine({
      adapters: [adapterA],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handleA = engineA.run(wf, undefined, { runId: 'release-run' });
    const outcomeA = await handleA.result;
    expect(outcomeA.status).toBe('suspended');
    expect(outcomeA.pending).toHaveLength(1);
    expect(outcomeA.pending[0]?.key).toMatch(/^approval:/);
    expect(executions).toEqual([]);
    expect(adapterA.calls).toHaveLength(1);

    // Offline: an operator resolves the approval directly over the store.
    const raw = await journal.load('release-run');
    const prior = raw.map((entry) => normalizeEntry(entry));
    const approvalSeq = prior.find((e) => e.kind === 'approval')?.seq;
    expect(approvalSeq).toBeDefined();
    const offline = new Replayer({
      runId: 'release-run',
      store: journal,
      priorEntries: prior,
    });
    const resolution = await offline.resolveSuspended(approvalSeq ?? -1, {
      by: 'external',
      value: { decision: 'allow' },
    });
    expect(resolution.applied).toBe(true);

    // Process B: resume continues the SAME turn; the tool executes once;
    // no re-suspension, no re-paid first turn. The only live model call
    // is the post-approval turn, so the script answers immediately.
    const adapterB = scriptedAdapter(() => ({ text: 'release done' }));
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handleB = engineB.resume('release-run', wf);
    const outcomeB = await handleB.result;
    expect(outcomeB.status).toBe('ok');
    expect(outcomeB.value).toBe('release done');
    expect(executions).toEqual(['{"site":"prod"}']);
    // The resumed process pays only the post-approval turn.
    expect(adapterB.calls).toHaveLength(1);

    const entries = (await journal.load('release-run')).map((entry) => normalizeEntry(entry));
    expect(entries.filter((e) => e.kind === 'approval')).toHaveLength(1);
    expect(entries.filter((e) => e.kind === 'resolution')).toHaveLength(1);
  });
});
